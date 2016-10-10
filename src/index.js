import 'babel-polyfill';
import { fork, call, put, take, select } from 'redux-saga/effects';
import { takeEvery, takeLatest } from 'redux-saga';
import get from 'lodash/get';
import mapValues from 'lodash/mapValues';

function createAction(firstArg) {
  let actionCreator = null;

  if (typeof firstArg === 'string') {
    const type = firstArg;

    actionCreator = (payload, error = false) => {
      if (typeof error === 'boolean' && error) {
        return { type, payload, error };
      }

      return { type, payload };
    };

    actionCreator.toString = () => {
      return type;
    };
  } else if (typeof firstArg === 'object') {
    const fetchObj = firstArg;

    const { url, params: objParams = {}, types, ...others } = fetchObj;

    if (url) {
      const fetchType = '@@saga/SAGA_FETCH';
      actionCreator = (params = {}, meta) => {
        return {
          type: fetchType,
          types,
          url,
          meta,
          params: {
            ...objParams,
            ...params,
          },
          ...others,
        };
      };

      actionCreator.toString = () => {
        return fetchType;
      };
    } else if (firstArg.type) {
      actionCreator = () => {
        return firstArg;
      };

      actionCreator.toString = () => {
        return firstArg.type;
      };
    } else {
      throw new Error('createAction params error!');
    }
  } else {
    throw new Error('createAction params error!');
  }

  return actionCreator;
}

function createActions(actions) {
  if (typeof actions !== 'object') {
    throw new Error('createActions params actions should be an object');
  }

  return mapValues(actions, createAction);
}


function selectGet(path) {
  return select(state => {
    return get(state, path);
  });
}

function createWatchGenerator(pattern, saga, ...args) {
  return fork(function* () {
    yield takeEvery(pattern, saga, ...args);
  });
}

function createWatchLatestGenerator(pattern, saga, ...args) {
  return fork(function* () {
    yield takeLatest(pattern, saga, ...args);
  });
}

export default function createSugar(Request) {
  // 监听 fetch action，可以看成是 redux-saga 中的 fetch 中间件
  function* putFetchActionsGenerator(action) {
    const { params, url, types, method = 'GET' } = action;
    const meta = { url, params, method };
    const [loadType, successType, failureType] = types;

    if (loadType) {
      yield put({
        type: loadType,
        meta,
        payload: null,
      });
    }

    try {
      const payload = yield call(Request, { url, params, method });
      const successAction = {
        type: successType,
        meta,
        payload,
      };

      yield put(successAction);

      return successAction;
    } catch (e) {
      console.error(e, e.stack);

      let failureAction = {
        meta,
        payload: e,
        reason: e.reason || '未知异常！',
        error: true,
      };

      if (failureType) {
        failureAction = {
          ...failureAction,
          type: failureType,
        };

        yield put(failureAction);
      }

      return failureAction;
    }
  }

  function putFetch(fetchAction) {
    return call(putFetchActionsGenerator, fetchAction);
  }

  function* pollingSaga(fetchAction) {
    const { defaultInterval } = fetchAction;

    while (true) {
      const result = yield Sugar.putFetch(fetchAction);

      if (result.error) {
        yield delay(defaultInterval);
        continue;
      }

      const { payload: { interval } } = result;
      yield delay(interval);
    }
  }

  function* beginPolling(pollingAction) {
    const { pollingUrl, defaultInterval = 300, type, params = {} } = pollingAction;

    const fetchAction = {
      url: pollingUrl,
      types: [null, type],
      params,
      defaultInterval,
    };

    const pollingTaskId = yield fork(pollingSaga, fetchAction);

    yield createWatchGenerator(type, function* () {
      yield cancel(pollingTaskId);
    });
  }

  return {
    get: selectGet,
    createWatch: createWatchGenerator,
    createWatchLatest: createWatchLatestGenerator,
    putFetch,
    fetchSagaMiddleware: function* () {
      yield takeEvery(action => {
        const { url, types } = action;

        return url && types && types.length;
      }, putFetchActionsGenerator);
    },
    pollingSagaMiddleware: function* () {
      yield takeEvery(action => {
        const { pollingUrl, type } = action;

        return pollingUrl && type;
      }, beginPolling);
    },
    createActions,
    createAction,
  };
};
