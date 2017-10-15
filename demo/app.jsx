import React, {Component, PropTypes} from "react";
import ReactDOM from 'react-dom';
import  './app.less';

export default class Root extends Component{
    static propTypes = {
        title: PropTypes.string.isRequired
    }
    static defaultProps = {
        title: 'App!!'
    }

    render(){
        return (<div>
                <h1>Welcome to {this.props.title}</h1>
                <img src="/brand.png"/>
            </div>)
    }
}

ReactDOM.render(
  (<Root/>),
  document.getElementById('container')
);
