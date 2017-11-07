import React, {Component, PropTypes} from "react";
import ReactDOM from 'react-dom';
import damo from 'damo-core';
import './index.less';

class User extends damo.BaseModel {
  static initialState = {
    profile: {}
  }

  getUser() {
    return this.setState({
      profile: {
        response: damo.Api('https://api.github.com/users/baqian')
      }
    });
  }
}

class Root extends Component {

  static propTypes = {
    profile: PropTypes.object.isRequired
  }
  static defaultProps = {
    profile: {
      login: 'App!!'
    }
  }

  componentWillMount(){
    this.props.getUser();
  }

  render() {
    return (
      <div>
        <h1>Welcome to {this.props.profile.login}</h1>
        <img src="/brand.png"/>
      </div>
    )
  }
}

damo.model('user', User);
export default damo.view(['user'], Root);
