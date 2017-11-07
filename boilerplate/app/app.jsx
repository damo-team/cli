import React from "react";
import ReactDOM from 'react-dom';
import damo from 'damo-core';

import {errorReducer} from 'damo-cntd';

import Root from './scenes';

import './app.less';

damo.init({}, {errors: errorReducer});

damo.autoLoadModels(require.context('./models', false, /\.js$/));

damo.autoLoadServices(require.context('./services', false, /\.js$/));

damo.autoLoadRoutes(require.context('./scenes', true, /index\.jsx$/));

damo.run(document.getElementById('container'))
