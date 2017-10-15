import React from "react";
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {autoLoadStore, autoLoadScenesRoutes} from 'damo-core';
import {errorReducer, AppModal} from 'damo-antd';
import {Router, Redirect, Route, IndexRedirect, browserHistory} from 'react-router';

import Root from './scenes';

import './app.less';

const store = autoLoadStore({}, [], require.context('./models', false, /\.js$/), () => {
  const reducers = {};
  reducers.errors = errorReducer;
  return reducers
});

const childRoutes = autoLoadScenesRoutes(require.context('./scenes', true, /\w+\/index\.jsx$/), (route) => {
  if(route.component.incomplete){
    return false;
  }
  Root.childRoutes.push(route);
});

const rootRoute = [{
  path: Root.routePath,
  component: Root,
  childRoutes: Root.childRoutes
}];


ReactDOM.render(
  (
    <Provider store={store}>
      <div>
        <Router history={browserHistory} routes={rootRoute}/>
        <AppModal/>
      </div>
    </Provider>
  ),
  document.getElementById('container')
);
