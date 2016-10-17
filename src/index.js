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

    const {
      url, pollingUrl, params: objParams = {}, meta: objMeta,
      type, types, ...others,
    } = fetchObj;

    if (url || pollingUrl) {
      actionCreator = (params = {}, meta) => {
        return {
          ...fetchObj,
          meta: {
            ...objMeta,
            ...meta,
          },
          params: {
            ...objParams,
            ...params,
          },
        };
      };

      actionCreator.toString = () => {
        return type;
      };
    } else if (firstArg.type) {
      actionCreator = () => {
        return firstArg;
      };

      actionCreator.toString = () => {
        return firstArg.type;
      };
    } else {
      throw new Error('createAction params error! unexpect action: ', firstArg);
    }
  } else {
    throw new Error('createAction params error! unexpect action: ', firstArg);
  }

  return actionCreator;
}

function createActions(actions) {
  if (typeof actions !== 'object') {
    throw new Error('createActions params actions should be an object, but received ', actions);
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

function* pollingSaga(fetchAction) {
  const { defaultInterval } = fetchAction;

  while (true) {
    try {
      const result = yield put.sync(fetchAction);
      const { payload: { interval } } = result;
      yield delay(interval);
    } catch (e) {
      yield delay(defaultInterval);
    }
  }
}

function* beginPolling(pollingAction) {
  const { pollingUrl, defaultInterval = 300, types, params = {} } = pollingAction;

  if (!types[1]) {
    throw Error('pollingAction types[1] is null', pollingAction);
  }

  const fetchAction = {
    url: pollingUrl,
    types,
    params,
    defaultInterval,
  };

  const pollingTaskId = yield fork(pollingSaga, fetchAction);
  const pattern = action => action.type === types[1] && action.stopPolling;

  yield createWatchGenerator(pattern, function* () {
    yield cancel(pollingTaskId);
  });
}

const Sugar = {
  get: selectGet,
  createWatch: createWatchGenerator,
  createWatchLatest: createWatchLatestGenerator,
  pollingSagaMiddleware: function* () {
    yield takeEvery(action => {
      const { pollingUrl, types } = action;

      return pollingUrl && types && types.length;
    }, beginPolling);
  },
  createActions,
  createAction,
};

export default Sugar;
