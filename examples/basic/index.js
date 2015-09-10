import React, { Component } from 'react';
import { createStore, compose, combineReducers } from 'redux';

import {
  ReduxRouter,
  routerStateReducer,
  reduxReactRouter
} from 'redux-react-router';

import { Route, Link } from 'react-router';
import { Provider, connect } from 'react-redux';
import { devTools } from 'redux-devtools';
import { DevTools, DebugPanel, LogMonitor } from 'redux-devtools/lib/react';
import createHistory from 'history/lib/createBrowserHistory';

@connect(state => ({ rs: state.router }))
class App extends Component {
  render() {
    const {rs} = this.props;
    const links = [
      '/',
      '/parent?foo=bar',
      '/parent/child?bar=baz',
      '/parent/child/123?baz=foo',
      '/parent/child/123?oldbaz=bar',
    ].map(l =>
      <p key={l}>
        <Link to={l}>{l}</Link>
      </p>
    );

    return (
      <div>
        <h1>App Container</h1>
        {links}
        {this.props.children}
        <ul>
        {Object.keys(rs).map(key=><li key={key}>{key}: {JSON.stringify(rs[key])}</li>)}
        </ul>
      </div>
    );
  }
}

class Parent extends Component {
  render() {
    return (
      <div>
        <h2>Parent</h2>
        {this.props.children}
      </div>
    );
  }
}

@connect(state => ({ baz: state.app.baz, childId: state.app.childId }))
class Child extends Component {
  render() {
    const {baz, childId} = this.props;
    return (
      <div>
        <h2>Child</h2>
        <p>baz: {baz}{childId && `, childId: ${childId}`}</p>

        <p>These buttons do not send router actions, oldbaz gets replaced by baz, the rest is ignored</p>

        <p>Note that count is persistent even when going
        back: <button onClick={() =>
           this.props.dispatch({type: 'clicked'})
        }>counter</button></p>

        <p>Note that clientId moves to a new
        page: <button onClick={() =>
           this.props.dispatch({type: 'next'})
        }>next child</button></p>
      </div>
    );
  }
}

const routes = (
  <Route path="/" component={App}>
    <Route path="parent" component={Parent}>
      <Route path="child" component={Child} />
      <Route path="child/:id" component={Child} />
    </Route>
  </Route>
);

const reducer = combineReducers({
  app: (state={baz: 'initial', showParent: true, showChild: false, childId: 123, count: 0}, action) => {
    switch (action.type) {
      case '@@reduxReactRouter/routerDidChange':
        // Some arbitrary conversion of url to state
        // It would be good to convert url by default to /[prefix]/[main]/[sub]/[subsub]/[restArray]?[queryObj]#[hash]
        const q = action.payload.location.query;
        const [nil, main, sub, subsub] = action.payload.location.pathname.split(/\/+/);
        const showParent = main === 'parent';
        const showChild = showParent ? sub === 'child' : state.showChild;
        const childId = showChild ? subsub && +subsub : state.showChild;
        return {
          ...state,
          baz: q.baz || q.oldbaz || state.baz,
          showParent, showChild, childId
        };
      case 'clicked':
        return {...state, count: state.count + 1};
      case 'next':
        return {...state, childId: state.childId > 0 ? state.childId + 1 : 1};
      default:
        return state;
    }
  },
  router: routerStateReducer
});

const store = compose(
  reduxReactRouter({
    routes,
    createHistory
  }),
  devTools()
)(createStore)(reducer);

// this is the mirror image of the reducer above, there should be some helpers
// maybe a model describing what each section of the url is named and which parameters
// are exportable and/or importable
// then an url compressor could be used without the app caring
store.subscribe(() => {
  const {app} = store.getState();
  let url;
  if (app.showParent) {
    if (app.showChild) {
      if (app.childId >= 0) {
        url = '/parent/child/' + app.childId;
      } else {
        url = '/parent/child';
      }
    } else {
      url = '/parent';
    }
  } else {
    url = '/';
  }
  const query = `?baz=${app.baz}&count=${app.count}`;

  if (window.location.pathname !== url) {
    console.log('pushing url', window.location.pathname, url, window.location.search, query);
    window.history.pushState({}, window.document.title, url + query);
  } else if (window.location.search !== query) {
    console.log('replacing url', window.location.pathname, url, window.location.search, query);
    window.history.replaceState({}, window.document.title, url + query);
  }
});

class Root extends Component {
  render() {
    return (
      <div>
        <Provider store={store}>{() =>
          <ReduxRouter />
        }</Provider>
        <DebugPanel top right bottom>
          <DevTools store={store} monitor={LogMonitor} />
        </DebugPanel>
      </div>
    );
  }
}

React.render(<Root />, document.getElementById('root'));
