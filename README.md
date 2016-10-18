# redux-saga-sugar

redux-saga utilities.

[![npm version](https://badge.fury.io/js/redux-saga-sugar.png)](https://badge.fury.io/js/redux-saga-sugar)
[![build status](https://travis-ci.org/jasonHzq/redux-saga-sugar.svg)](https://travis-ci.org/jasonHzq/redux-saga-sugar)
[![npm downloads](https://img.shields.io/npm/dt/redux-saga-sugar.svg?style=flat-square)](https://www.npmjs.com/package/rredux-saga-sugar)

## Getting started

### Install

```js
$ npm i -S redux-saga-sugar
```

## Documentation

### pollingSagaMiddleware

实时中间件

```js
export function* rootSaga() {
  yield fork(Sugar.pollingSagaMiddleware);
}

const actions = Sugar.createActions({
  beginPolling: {
    pollingSUrl: Urlmap.polling,
    types: [load, pollingSuccess, failure],
  },
  stopPolling: {
    type: pollingSuccess,
    stopPolling: true,
  },
});
```

### createActions / createAction

* `createAction(SWITCH_TAB)`

即

```js
function(payload) {
  return {
    type: SWITCH_TAB,
    payload
  };
}
```

* `createAction({ type: SWITCH_TAB })`

即

```js
function() {
  return {
    type: SWITCH_TAB,
  };
}
```

```js
import Sugar from 'redux-saga-sugar';

export const actions = Sugar.createActions({
  loadBasicData: {
    url: getUrl('loadBasicData'),
    types: [LOAD_BASIC_DATA_LOAD, LOAD_BASIC_DATA_SUCCESS, LOAD_BASIC_DATA_FAILURE],
  },
  loadData: {
    url: getUrl('loadData'),
    types: [LOAD_DATA_LOAD, LOAD_DATA_SUCCESS, LOAD_DATA_FAILURE],
  },
  switchTab: SWITCH_TAB,
  beginLoad: BEGIN_LOAD,
});
```

### createWatch

```js
yield Sugar.createWatch(pattern, saga, ...args)
```

即

```js
yield fork(function* () {
  yield takeEvery(pattern, saga, ...args);
});
```

例子：

```js
export function saga() {
  yield Sugar.createWatch([SWITCH_TAB, BEGIN_LOAD], loadDataSaga);
}
```

### get

```js
yield Sugar.get(path);
```

即

```js
yield select(state => {
  return _.get(state, path);
});
```

例子：

```js
function* loadDataSaga() {
  const id = yield Sugar.get(`${currPath}.id`);
  yield put(actions.loadData({ id }));
}
```

## License

[MIT](https://opensource.org/licenses/MIT)
