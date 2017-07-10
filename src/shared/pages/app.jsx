import { connect } from 'react-redux';
import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router-dom';
import Home from '../components/home';
import { NavigationSidebar } from '../components/shared';
import RecordAudio from './record-audio';
import styles from '../styles/app-controller.less';

const mapStateToProps = (state) => ({
  isAuthenticated: state.profile.id !== -1,
  profile: state.profile,
});


class App extends Component {
  static propTypes = {
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
    }),
    children: PropTypes.object,
  }

  state = {
    activeTab: this.props.location.pathname,
    isRecording: false,
  }

  componentDidMount() {
    window.onbeforeunload = () => this.saveState();
    this.setState(JSON.parse(window.localStorage.getItem('state') || '{}'))
  }

  componentWillUnmount() {
    this.saveState();
  }

  saveState() {
    window.localStorage.setItem('state', JSON.stringify({ ...this.state, isRecording: false }));
  }

  renderChildren() {
    if (this.props.isAuthenticated) {
      return this.props.children;
    }

    return <Home />;
  }

  renderGrid() {
    return (
      <div>
        <div className={styles.testingVertical} />
        <div className={styles.testingVertical1} />
        <div className={styles.testingHorizontal} />
        <div className={styles.testingHorizontal1} />
      </div>
    );
  }

  renderSidebar() {
    return (
      <NavigationSidebar
        activeTab={this.state.activeTab}
        currentUser={this.props.profile}
        navigateToPath={url => this.setState({ activeTab: url})}
      />
    );
  }

  renderNavbar() {
    return (
      <div className="navbar navbar__no-home">
        <Link to="/"><div className="home-button">Noteable</div></Link>
        <div className={styles.searchBarContainer}>
          <div className={styles.searchBarBox}>
            <input className={styles.searchBar} placeholder="Search people, events, or songs" />
          </div>
        </div>
        {this.state.isRecording ? 
          <div className={styles.recordContainer}>
            <RecordAudio />
          </div>
          : <div className={styles.record} onClick={() => this.setState({ isRecording: true })}>Record</div>}
      </div>
    );
  }

  render() {
    return (
      <div>
        <link href="/css/bundle.css" rel="stylesheet" type="text/css" />
        <link href="https://fonts.googleapis.com/css?family=Lobster" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/draft-js/0.7.0/Draft.min.css" />
        {this.renderNavbar()}
        {this.renderChildren()}
      </div>
    );
  }
};


export default connect(mapStateToProps)(App);