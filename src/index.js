import 'babel-polyfill';
import { fork, call, put, take, select, cancel } from 'redux-saga/effects';
import { takeEvery, takeLatest, delay } from 'redux-saga';
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
      url, pollingSUrl, pollingUrl, params: objParams = {}, meta: objMeta,
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
    } else if (pollingSUrl) {
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
          type: `@saga/polling/${types[1]}`
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
      console.error('unexpect action: ', firstArg);
      throw new Error('action has no type property! ');
    }
  } else {
    console.error('unexpect action: ', firstArg);
    throw new Error('createAction params error! ');
  }

  return actionCreator;
}

function createActions(actions) {
  if (typeof actions !== 'object') {
    console.error('unexpect actions: ', actions);
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

function* defaultGetParams() {
  return {};
}

function* pollingSaga(fetchAction) {
  const { defaultInterval, mockInterval, shouldStopFirst, getParams, params } = fetchAction;
  let isFirstPolling = true;

  while (true) {
    try {
      const nowParams = yield call(getParams || defaultGetParams);
      const finalParams = {
        ...nowParams,
        ...params,
      };
      const result = yield put.sync({
        ...fetchAction,
        params: finalParams,
      });

      if (!result) {
        if (shouldStopFirst && isFirstPolling) {
          break;
        }

        yield delay(defaultInterval * 1000);
      } else {
        isFirstPolling = false;
        const interval = mockInterval || result.interval;

        yield delay(interval * 1000);
      }
    } catch (e) {
      if (shouldStopFirst && isFirstPolling) {
        break;
      }

      yield delay(defaultInterval * 1000);
    }
  }
}

function* beginPolling(pollingAction) {
  const {
    pollingSUrl, defaultInterval = 300, mockInterval, types, params = {},
    shouldStopFirst = false, getParams,
  } = pollingAction;

  if (!types[1]) {
    throw Error('pollingAction types[1] is null', pollingAction);
  }

  const fetchAction = {
    url: pollingSUrl,
    types,
    params,
    mockInterval,
    defaultInterval,
    getParams,
    shouldStopFirst,
  };

  const pollingTaskId = yield fork(pollingSaga, fetchAction);
  const pattern = action => action.type === types[1] && action.stopPolling;

  yield take(pattern);
  yield cancel(pollingTaskId);
}

const Sugar = {
  get: selectGet,
  createWatch: createWatchGenerator,
  createWatchLatest: createWatchLatestGenerator,
  pollingSagaMiddleware: function* () {
    try {
      yield takeEvery(action => {
        const { pollingSUrl, types } = action;

        return pollingSUrl && types && types.length;
      }, beginPolling);
    } catch (e) {
      console.err(e);
    }
  },
  createActions,
  createAction,
};

export default Sugar;
