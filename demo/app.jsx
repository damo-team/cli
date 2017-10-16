import React, {Component, PropTypes} from "react";
import ReactDOM from 'react-dom';
import  './app.less';

function Title(props){
    return (<h1>Welcome to {props.title}</h1>);
}

export default class Root extends Component{
    static propTypes = {
        title: PropTypes.string.isRequired
    }
    static defaultProps = {
        title: 'App!!'
    }

    render(){
        return (<div>
                <Title title={this.props.title}/>
                <img src="/brand.png"/>
            </div>)
    }
}

ReactDOM.render(
  (<Root/>),
  document.getElementById('container')
);
