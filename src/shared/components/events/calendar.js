import React from 'react';
import Moment from 'moment';

const minute = new Array(4).fill(0).map((value, index) => {
  if (index === 0) {
    return '00';
  }
  return (index * 15).toString();
});
const hour = new Array(12).fill(0).map((value, index) => {
  return (index + 1).toString();
});
const styles = `
            .left-selector {
              cursor: pointer;
              float: left;
              font-size: 12px;
              padding: 0 10px;
            }

            .selector:hover {
              color: #9ad2ff;
            }

            .right-selector {
              cursor: pointer;
              float: right;
              font-size: 12px;
              padding: 0 10px;
            }

            .calendar-popup {
              -webkit-box-shadow: 0px 6px 15px -2px rgba(0,0,0,0.75);
              -moz-box-shadow: 0px 6px 15px -2px rgba(0,0,0,0.75);
              box-shadow: 0px 6px 15px -2px rgba(0,0,0,0.75);
              width: 200px;
            }

            table {
              font-size: 13px;
              line-height: 20px;
              padding: 4px;
              text-align: center;
              width: 100%;
            }

            td:hover {
              box-shadow: 0 0 5px 1px rgba(154, 210, 255, 0.75);
              cursor: pointer;
            }

            .time-error {
              color: #D46A4A;
              font-size: 11px;
            }

            .picker-container {
              display: inline-flex;
              width: 50%;
            }

            .select {
              background: white;
              background-image: url(/images/down-arrow.svg);
              background-position-x: 90%;
              background-position-y: 55%;
              background-repeat: no-repeat;
              background-size: 10px;
              flex: 1;
              height: 32px;
              margin: 5px;
              text-indent: 8px;
              -webkit-appearance: none;
            }
          `;

class Calendar extends React.Component {
  constructor(props) {
    super(props);
    const date = this.props.date ? this.props.date : Moment();

    this.state = ({
      date: date.format('MM/DD/YYYY'),
      tooltipLeft: null,
      tooltipTop: null,
      showTooltipStartDate: false,
      showTooltipEndDate: false,
      activeDate: Moment().format('MM/DD/YYYY'),
      startDate: Moment().format('MM/DD/YYYY'),
      endDate: Moment().format('MM/DD/YYYY'),
      endHour: 7,
      startHour: 6,
      endMinute: '00',
      startMinute: '00',
      startKind: 'PM',
      endKind: 'PM',
      invalidTime: false
    });

    this.onDateChange = this._onDateChange.bind(this);
    this.onFocusStart = this._onFocusStart.bind(this);
    this.onFocusEnd = this._onFocusEnd.bind(this);
    this.closeTooltips = this._closeTooltips.bind(this);
    this.forwardMonth = this._forwardMonth.bind(this);
    this.backMonth = this._backMonth.bind(this);
    this.selectDate = this._selectDate.bind(this);

    this.windowResize = this._windowResize.bind(this);
  }

  componentDidMount() {
    this.windowResize();
    window.onresize = this.debounceResize.bind(this, this.windowResize);
    document.body.onclick = this.closeTooltips;
  }

  debounceResize(callback) {
    if (this.resizeCallbackTimeout !== 0) {
      return;
    }

    this.resizeCallbackTimeout = window.setTimeout(callback, 300);
  }

  _windowResize() {
    const parentNode = ReactDOM.findDOMNode(this.refs.parent);
    this.resizeCallbackTimeout = 0;
    this.setState({
      parentWidth: parentNode.offsetWidth
    });
  }

  _selectDate(event) {
    const day = event.target.innerHTML;
    let startHour = this.state.startHour;
    let endHour = this.state.endHour;
    let startMinute = this.state.startMinute;
    let endMinute = this.state.endMinute;
    let startKind = this.state.startKind;
    let endKind = this.state.endKind;
    const classes = event.target.classList;

    if (classes.contains('start-hour-picker')) {
      startHour = event.target.value;
    } else if (classes.contains('end-hour-picker')) {
      endHour = event.target.value;
    } else if (classes.contains('start-minute-picker')) {
      startMinute = event.target.value;
    } else if (classes.contains('end-minute-picker')) {
      endMinute = event.target.value;
    } else if (classes.contains('start-kind-picker')) {
      startKind = event.target.value;
    } else if (classes.contains('end-kind-picker')) {
      endKind = event.target.value;
    }

    const startTime = `${startHour}:${startMinute} ${startKind}`;
    const endTime = `${endHour}:${endMinute} ${endKind}`;

    const endDate = Moment(`${this.state.endDate} ${endTime}`);
    const startDate = Moment(`${this.state.startDate} ${startTime}`);
    let isValid = false;

    if (this.state.showTooltipEndDate) {
      endDate.date(day);
    } else if (this.state.showTooltipStartDate) {
      startDate.date(day);
    }

    if (endDate.isBefore(startDate)) {
      this.setState({
        invalidTime: true,
        errorMessage: 'The times you have selected are invalid.'
      });
    } else if (startDate.isBefore(Moment())) {
      this.setState({
        invalidTime: true,
        errorMessage: 'The time you have selected has already passed.'
      });
    } else {
      isValid = true
      this.setState({
        invalidTime: false
      });
    }

    this.props.onChange({
      endDate: endDate.format('MM/DD/YYYY HH:mm A'),
      startDate: startDate.format('MM/DD/YYYY HH:mm A'),
      isValid: isValid
    });

    this.setState({
      endDate: endDate.format('MM/DD/YYYY'),
      startDate: startDate.format('MM/DD/YYYY'),
      endHour: endHour,
      startHour: startHour,
      endMinute: endMinute,
      startMinute: startMinute,
      endKind: endKind,
      startKind: startKind,
      showTooltipStartDate: false,
      showTooltipEndDate: false,
    });
  }

  _backMonth() {
    const activeDate = Moment(this.state.activeDate);
    activeDate.subtract(1, 'months');
    this.setState({
      activeDate: activeDate.toString(),
      startDate: this.state.showTooltipStartDate ? activeDate.toString() : this.state.startDate,
      endDate: this.state.showTooltipEndDate ? activeDate.toString() : this.state.endDate
    });
  }

  _forwardMonth() {
    const activeDate = Moment(this.state.activeDate);
    activeDate.add(1, 'months');
    this.setState({
      activeDate: activeDate.toString(),
      startDate: this.state.showTooltipStartDate ? activeDate.format('MM/DD/YYYY') : this.state.startDate,
      endDate: this.state.showTooltipEndDate ? activeDate.format('MM/DD/YYYY') : this.state.endDate
    });
  }

  _closeTooltips(event) {
    if (event.target.classList.contains('selector') || event.target.classList.contains('day') || event.target.classList.contains('calendar-popup') || event.target.classList.contains('calendar-date')) {
      return;
    }
    this.setState({
      showTooltipStartDate: false,
      showTooltipEndDate: false
    });
  }

  _onFocusStart(event) {
    this.setState({
      activeDate: this.state.startDate,
      tooltipTop: event.target.offsetTop + 30,
      tooltipLeft: event.target.offsetLeft + 30,
      showTooltipStartDate: true
    });
    return;
  }

  _onFocusEnd(event) {
    this.setState({
      activeDate: this.state.endDate,
      tooltipTop: event.target.offsetTop + 30,
      tooltipLeft: event.target.offsetLeft + 30,
      showTooltipEndDate: true
    });
    return;
  }

  _onDateChange(event) {
    let value = event.target.value;
    let date = Moment();
    const prevValue = this.state.activeDate;

    if (prevValue.length > value.length) {
      if (event.target.classList.contains('start')) {
        this.setState({
          startDate: value
        });
      } else {
        this.setState({
          endDate: value
        });
      }

      return;
    }

    if (value.match(/[A-Za-z]/)) {
      value = value.replace(value.match(/[A-Za-z]/)[0], '');
    }

    if (value.length === 1) {
      if (parseInt(value[0]) > 1) {
        value = `0${value}/`;
      }
    }

    if (value.length === 2) {
      if (parseInt(value[0]) > 2) {
        value = `0${value[0]}/${value[1]}`;
      } else {
        value = `${value}/`;
      }
    }

    if (value.length === 4) {
      if (parseInt(value[3]) > 3) {
        value = `${value.substring(0, 3)}0${value[3]}`;
      }
    }

    if (value.length === 5) {
      value = `${value}/`;
    }

    if (value.length === 10) {
      date = Moment(value, 'MM/DD/YYYY');// +-HH:mm A
    }

    if (value.length === 11) {
      value = value.substring(0, 10);
    }

    if (event.target.classList.contains('start')) {
      this.setState({
        startDate: value,
        activeDate: date.format('MM/DD/YYYY')
      });
    } else {
      this.setState({
        endDate: value,
        activeDate: date.format('MM/DD/YYYY')
      });
    }
  }

  renderTimeError() {
    return (
      <div className="time-error">{this.state.errorMessage}</div>
    );
  }

  renderMonth() {
    const date = Moment(this.state.activeDate);
    date.date(1);
    const month = date.month();
    const weekday = date.day();
    date.subtract(weekday, 'days');
    const rowNum = (weekday > 4 && Moment(this.state.activeDate).daysInMonth() === 31) || (weekday === 6 && Moment(this.state.activeDate).daysInMonth() === 30) ? 6 : 5;
    const rows = new Array(rowNum).fill(0).map((zero, index) => {
      return (
        <tr key={`${index}week`} className="calendar-week">
          {new Array(7).fill(0).map((fill, weekday) => {
            const day = date.date();
            if (day > weekday && index === 0) {
              date.add(1, 'days');
              return (
                <td className="day" key={day} onClick={this.backMonth} style={{color: '#ccc'}}>
                  {day}
                </td>
              );
            }

            if (date.month() > month) {
              date.add(1, 'days');
              return (
                <td className="day" key={day} onClick={this.forwardMonth} style={{color: '#ccc'}}>
                  {day}
                </td>
              );
            }

            date.add(1, 'days');
            return (
                <td className="day" key={day} onClick={this.selectDate}>
                  {day}
                </td>
            );
          })}
        </tr>
      );
    });

    return(
      <table>
          <tbody>
            <tr>
              <th colSpan="7">
                <span className="left-selector selector" onClick={this.backMonth}>{'<'}</span>
                <span>{`${Moment(this.state.activeDate).format('MMMM')} ${Moment(this.state.activeDate).format('YYYY')}`}</span>
                <span className="right-selector selector" onClick={this.forwardMonth}>{'>'}</span>
              </th>
            </tr>
            <tr>
              <th>S</th>
              <th>M</th>
              <th>T</th>
              <th>W</th>
              <th>TH</th>
              <th>F</th>
              <th>S</th>
            </tr>
            {rows}
          </tbody>
      </table>
    );
  }

  renderCalendarPopup() {
    return (
      <div className="calendar-popup" style={{background: 'white', position: 'absolute', top: `${this.state.tooltipTop}px`, left: `${this.state.tooltipLeft}px`, padding: '4px', textAlign: 'center'}}>
        {this.renderMonth()}
      </div>
    );
  }

  render() {
    return (
      <div className="calendar-date-picker-container" ref="parent" onClick={this.closeTooltips} >
        {this.state.invalidTime ? this.renderTimeError() : null}
        <input className="calendar-date start" style={this.state.parentWidth < 300 ? {width: '100%'} : {width: '50%'}} value={this.state.startDate} onChange={this.onDateChange} onFocus={this.onFocusStart} onKeyDown={this.onKeyDown} placeholder="MM/DD/YYYY" ref="startDate"/>
        {this.state.showTooltipStartDate ? this.renderCalendarPopup() : null}
        <div className="picker-container" onClick={this.closeTooltips} style={this.state.parentWidth < 300 ? {display: 'flex', width: '100%'} : {display: 'inline-flex', width: '50%'}}>
          <select value={this.state.startHour} onChange={this.selectDate} className="start-hour-picker select">
            {hour.map((time) => {
              return (
                <option key={`${time}-hour-start`} value={time}>{time}</option>
              );
            })}
          </select>
          <select value={this.state.startMinute} onChange={this.selectDate} className="start-minute-picker select">
            {minute.map((time) => {
              return (
                <option key={`${time}-minute-start`} value={time}>{time}</option>
              );
            })}
          </select>
          <select value={this.state.startKind} onChange={this.selectDate} className="start-kind-picker select">
            <option value={'AM'}>{'AM'}</option>
            <option value={'PM'}>{'PM'}</option>
          </select>
        </div>
        <input className="calendar-date" style={this.state.parentWidth < 300 ? { width: '100%'} : { width: '50%'}} value={this.state.endDate} onChange={this.onDateChange} onFocus={this.onFocusEnd} onKeyDown={this.onKeyDown} placeholder="MM/DD/YYYY" ref="startDate"/>
        {this.state.showTooltipEndDate ? this.renderCalendarPopup() : null}
        <div className="picker-container" onClick={this.closeTooltips} style={this.state.parentWidth < 300 ? {display: 'flex', width: '100%'} : {display: 'inline-flex', width: '50%'}}>
          <select value={this.state.endHour} onChange={this.selectDate} className="end-hour-picker select">
            {hour.map((time) => {
              return (
                <option key={`${time}-hour-end`} value={time}>{time}</option>
              );
            })}
          </select>
          <select value={this.state.endMinute} onChange={this.selectDate} className="end-minute-picker select">
            {minute.map((time) => {
              return (
                <option key={`${time}-minute-end`} value={time}>{time}</option>
              );
            })}
          </select>
          <select value={this.state.endKind} onChange={this.selectDate} className="end-kind-picker select">
            <option value={'AM'}>{'AM'}</option>
            <option value={'PM'}>{'PM'}</option>
          </select>
        </div>
        <style>
          {styles}
        </style>
      </div>
    );
  }
}

Calendar.propTypes = {
  onChange: React.PropTypes.func.isRequired
};

export default Calendar;
