import React from 'react';
import GoogleMaps from 'google-maps';
import Moment from 'moment';
import ajax from '../../ajax';
import Calendar from './calendar';
import styles from './styles.less';

GoogleMaps.LIBRARIES = ['geometry', 'places', 'controls'];
let Google;

module.exports = class CreateEvent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      startDate: Moment().hour(18).minute(0),
      endDate: Moment().hour(19).minute(0),
      dateIsValid: true,
      positionSet: false,
      eventName: '',
      nameSet: false,
      notes: ''
    }

    this.handleDateChange = this._handleDateChange.bind(this);
    this.changeName = this._changeName.bind(this);
    this.createEvent = this._createEvent.bind(this);
  }

  componentDidMount () {
    navigator.geolocation.getCurrentPosition( position => {
      GoogleMaps.load( google => {
        Google = google;

        const map = new Google.maps.Map(document.getElementById('map'), {
          center: { lat: position.coords.latitude, lng: position.coords.longitude },
          zoom: 10
        });

        this.setState({
          loading: false
        });

        const input = ReactDOM.findDOMNode(this.refs.searchBox);
        const searchBox = new google.maps.places.SearchBox(input);

        const autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.bindTo('bounds', map);

        //map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', () => {
          searchBox.setBounds(map.getBounds());
        });

        let markers = [];
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', () => {
          const places = searchBox.getPlaces();

          if (places.length === 0) {
            return;
          }

          // Clear out the old markers.
          markers.forEach( marker => {
            marker.setMap(null);
          });
          markers = [];

          // For each place, get the icon, name and location.
          const bounds = new google.maps.LatLngBounds();
          places.forEach( place => {
            const icon = {
              url: place.icon,
              size: new google.maps.Size(71, 71),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(17, 34),
              scaledSize: new google.maps.Size(30, 30)
            };

            const marker = new google.maps.Marker({
              map: map,
              icon: icon,
              title: place.name,
              position: place.geometry.location
            });

            // Create a marker for each place.
            markers.push(marker);
            this.setState({
              eventLatitude: place.geometry.location.lat(),
              eventLongitude: place.geometry.location.lng(),
              positionSet: true
            });

            if (place.geometry.viewport) {
              // Only geocodes have viewport.
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
          });

          map.fitBounds(bounds);

          if (map.getZoom()>18) {
            map.setZoom(18);
          }
        });
      });
    });
  }

  _createEvent() {
    ajax.Post('/api/events/create', JSON.stringify(this.state), (eventId) => {
      window.location.pathname = `/api/events?eventId=${eventId.lastval}`;
    });
  }

  _changeName(event) {
    if (event.target.value.trim().length === 0) {
      this.setState({
        nameSet: false
      });

      return;
    }

    this.setState({
      nameSet: true,
      eventName: event.target.value.trim()
    });
  }

  _handleDateChange(value) {
    this.setState({
      startDate: value.startDate,
      endDate: value.endDate,
      dateIsValid: value.isValid
    });
  }

  renderLoader() {
    return (
      <div className={styles.loader}>
        <div className={styles.spinner} />
      </div>
    );
  }

  renderComponent() {
    return (
      <div className={styles.eventForm}>
        <div className={styles.eventFormWrapper}>
          <label>Name</label>
          <input name="name" className={styles.eventName} onChange={this.changeName} type="text" placeholder="Name"/>
          <label>Date</label>
          <Calendar onChange={this.handleDateChange}/>
          <label>Location</label>
          <input name="location" className={styles.mapSearch} ref="searchBox" type="text" placeholder="Search Box"/>
          <label>Notes</label>
          <textarea name="notes" className={styles.eventNotes} type="text" placeholder="Leave a note or description."/>
          <button className={styles.submitEvent} onClick={this.createEvent} disabled={this.state.positionSet && this.state.nameSet && this.state.dateIsValid ? false : 'disabled'}>Submit</button>
        </div>
      </div>
    );
  }

  render () {
    return (
      <div className={styles.createEventContainer}>
        <div id="map" style={{ height: '100%'}} />
        {this.state.loading ? this.renderLoader() : this.renderComponent()}
      </div>
    );
  }
}