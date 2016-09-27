# redux-saga-sugar

redux-saga utilities.

[![npm version](https://badge.fury.io/js/redux-saga-sugar.png)](https://badge.fury.io/js/redux-saga-sugar)
[![npm downloads](https://img.shields.io/npm/dt/redux-saga-sugar.svg?style=flat-square)](https://www.npmjs.com/package/redux-saga-sugar)

## Getting started

### Install

```js
$ npm i -S redux-saga-sugar
```

### Create Sugar

每个项目都有自己不同的 fetch 方法，因此这里需要提供一个符合这种规范的 fetch 方法：

```js
fetch({ url, params, method }).then(data => {
  console.log(data);
}, err => {
  console.log(err.reason);
});
```

创建 Sugar:

```js
import createSugar from 'redux-saga-sugar';
import fetch from './fetch';

const Sugar = createSugar(fetch);

export default Sugar;
```

## Documentation

### fetchSagaMiddleware

用 redux-saga 实现的可以代替 fetch-middleware 的中间件

```js
export function* rootSaga() {
  yield fork(Sugar.fetchSagaMiddleware);
}
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
import Sugar from './Sugar';

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

### putFetch

如果用 `put` 的 `Effect` 去执行 `fetch action`， `yield` 并不会阻塞到异步接口请求结束，这个时候需要 `putFetch`

```js
function* loadDataSaga() {
  const activeKey = yield Sugar.get(`${currPath}.activeKey`)

  const result = yield Sugar.putFetch(actions.loadBasicData({ activeKey }));

  if (result.error) {
    Notify(result.reason);

    return;
  }

  const { ids } = result;

  yield put(actions.loadDataSaga);
}
```

## License

[MIT](https://opensource.org/licenses/MIT)
