/**
 * Created by bogdanbegovic on 8/20/16.
 */

import React, {Component} from 'react';
import {
    View,
    Animated,
    Easing
} from 'react-native';

import CalendarHeader from './CalendarHeader';
import CalendarDay from './CalendarDay';
import WeekSelector from './WeekSelector';
import moment from 'moment';
import styles from './Calendar.style.js';

/*
 * Class CalendarStrip that is representing the whole calendar strip and contains CalendarDay elements
 *
 */
export default class CalendarStrip extends Component {

    static propTypes = {
        style: React.PropTypes.any,
        calendarColor: React.PropTypes.string,

        startingDate: React.PropTypes.any,
        selectedDate: React.PropTypes.any,
        onDateSelected: React.PropTypes.func,
        onWeekChanged: React.PropTypes.func,
        useIsoWeekday: React.PropTypes.bool,
        minDate: React.PropTypes.any,
        maxDate: React.PropTypes.any,
        datesWhitelist: React.PropTypes.array,
        datesBlacklist: React.PropTypes.array,

        showMonth: React.PropTypes.bool,
        showDayName: React.PropTypes.bool,
        showDayNumber: React.PropTypes.bool,
        showDate: React.PropTypes.bool,

        leftSelector: React.PropTypes.any,
        rightSelector: React.PropTypes.any,
        iconLeft: React.PropTypes.any,
        iconRight: React.PropTypes.any,
        iconStyle: React.PropTypes.any,
        iconLeftStyle: React.PropTypes.any,
        iconRightStyle: React.PropTypes.any,
        iconContainer: React.PropTypes.any,

        calendarHeaderStyle: React.PropTypes.any,
        calendarHeaderFormat: React.PropTypes.string,

        calendarAnimation: React.PropTypes.object,
        daySelectionAnimation: React.PropTypes.object,

        customDatesStyles: React.PropTypes.array,

        dateNameStyle: React.PropTypes.any,
        dateNumberStyle: React.PropTypes.any,
        weekendDateNameStyle: React.PropTypes.any,
        weekendDateNumberStyle: React.PropTypes.any,
        highlightDateNameStyle: React.PropTypes.any,
        highlightDateNumberStyle: React.PropTypes.any,
        disabledDateNameStyle: React.PropTypes.any,
        disabledDateNumberStyle: React.PropTypes.any,
        disabledDateOpacity: React.PropTypes.number,
        styleWeekend: React.PropTypes.bool,

        locale: React.PropTypes.object
    };

    static defaultProps = {
        useIsoWeekday: true,
        showMonth: true,
        showDate: true,
        iconLeft: require('./img/left-arrow-black.png'),
        iconRight: require('./img/right-arrow-black.png'),
        calendarHeaderFormat: 'MMMM YYYY',
        datesWhitelist: undefined,
        datesBlacklist: undefined,
        disabledDateOpacity: 0.3,
        customDatesStyles: [],
    };

    constructor(props) {
        super(props);
        this.numDaysInWeek = 7;

        if(props.locale) {
            if(props.locale.name && props.locale.config) {
                moment.locale(props.locale.name, props.locale.config);
            } else {
                throw new Error('Locale prop is not in the correct format. \b Locale has to be in form of object, with params NAME and CONFIG!');
            }
        }

        const startingDate = this.getInitialStartingDate();
        const selectedDate = this.setLocale(moment(this.props.selectedDate));
        const weekData = this.updateWeekData(startingDate, selectedDate);

        this.state = {
            startingDate,
            selectedDate,
            ...weekData
        };

        this.resetAnimation();

        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUpdate = this.componentWillUpdate.bind(this);
        this.updateWeekData = this.updateWeekData.bind(this);
        this.getPreviousWeek = this.getPreviousWeek.bind(this);
        this.getNextWeek = this.getNextWeek.bind(this);
        this.onDateSelected = this.onDateSelected.bind(this);
        this.isDateSelected = this.isDateSelected.bind(this);
        this.animate = this.animate.bind(this);
        this.resetAnimation = this.resetAnimation.bind(this);
    }

    componentDidMount() {
        // Animate showing of CalendarDay elements
        this.animate();
    }

    //Receiving props and set date states, minimizing state updates.
    componentWillReceiveProps(nextProps) {
        let selectedDate = {}, startingDate = {}, weekData = {};
        let updateState = false;

        if (!this.compareDates(nextProps.selectedDate, this.props.selectedDate)) {
            updateState = true;
            selectedDate = {selectedDate: this.setLocale(moment(nextProps.selectedDate))};
            startingDate = {startingDate: this.updateWeekStart(selectedDate.selectedDate)};
            weekData = this.updateWeekData(startingDate.startingDate, selectedDate.selectedDate, nextProps);
        }

        if (!updateState && !this.compareDates(nextProps.startingDate, this.props.startingDate)) {
            updateState = true;
            startingDate = this.setLocale(moment(nextProps.startingDate));
            startingDate = {startingDate: this.updateWeekStart(startingDate)};
            weekData = this.updateWeekData(startingDate.startingDate, this.state.selectedDate, nextProps);
        }

        if (!updateState && (
            JSON.stringify(nextProps.datesBlacklist) !== JSON.stringify(this.props.datesBlacklist) ||
            JSON.stringify(nextProps.datesWhitelist) !== JSON.stringify(this.props.datesWhitelist) ||
            JSON.stringify(nextProps.customDatesStyles) !== JSON.stringify(this.props.customDatesStyles) ))
        {
            updateState = true;
            // No need to update week start here
            startingDate = {startingDate: this.setLocale(moment(nextProps.startingDate))};
            weekData = this.updateWeekData(startingDate.startingDate, this.state.selectedDate, nextProps);
        }

        if (updateState) {
            this.setState({ ...selectedDate, ...startingDate, ...weekData });
        }
    }

    //Only animate CalendarDays if the selectedDate is the same
    //Prevents animation on pressing on a date
    componentWillUpdate(nextProps, nextState) {
        if (nextState.selectedDate === this.state.selectedDate) {
            this.resetAnimation();
            this.animate();
        }
    }

    // Check whether two datetimes are of the same value.  Supports Moment date,
    // JS date, or ISO 8601 strings.
    // Returns true if the datetimes values are the same; false otherwise.
    compareDates(date1, date2) {
      if (date1 && date1.valueOf && date2 && date2.valueOf &&
        (date1.valueOf() === date2.valueOf()))
      {
        return true;
      }
      else {
        return JSON.stringify(date1) === JSON.stringify(date2);
      }
    }

    //Function that checks if the locale is passed to the component and sets it to the passed moment instance
    setLocale(momentInstance) {
        if (this.props.locale) {
            momentInstance.locale(this.props.locale.name);
        }
        return momentInstance;
    }

    getInitialStartingDate() {
        if (this.props.startingDate) {
            return this.setLocale(moment(this.props.startingDate));
        } else {
            return this.setLocale(moment(this.props.selectedDate)).isoWeekday(1);
        }
    }

    //Set startingDate to the previous week
    getPreviousWeek() {
        const previousWeekStartDate = this.state.startingDate.clone().subtract(1, 'w');
        if (this.props.onWeekChanged) {
            if(this.props.useIsoWeekday) {
                this.props.onWeekChanged(previousWeekStartDate.clone().startOf('isoweek'));
            }
            else {
                this.props.onWeekChanged(previousWeekStartDate.clone());
            }
        }
        let weekData = this.updateWeekData(previousWeekStartDate);
        this.setState({startingDate: previousWeekStartDate, ...weekData});
    }

    //Set startingDate to the next week
    getNextWeek() {
        const nextWeekStartDate = this.state.startingDate.clone().add(1, 'w');
        if (this.props.onWeekChanged) {
            if(this.props.useIsoWeekday) {
                this.props.onWeekChanged(nextWeekStartDate.clone().startOf('isoweek'));
            }
            else {
                this.props.onWeekChanged(nextWeekStartDate.clone());
            }
        }
        let weekData = this.updateWeekData(nextWeekStartDate);
        this.setState({startingDate: nextWeekStartDate, ...weekData});
    }

    // Set the current visible week to the selectedDate
    // When date param is undefined, an update always occurs (e.g. initialize)
    updateWeekStart(newStartDate, originalStartDate = this.state.startingDate) {
      let startingDate = moment(newStartDate).startOf('day');
      let daysDiff = startingDate.diff(originalStartDate.startOf('day'), 'days');
      if (daysDiff === 0) {
        return originalStartDate;
      }
      let addOrSubtract = daysDiff > 0 ? 'add' : 'subtract';
      let adjustWeeks = daysDiff / 7;
      adjustWeeks = adjustWeeks > 0 ? Math.floor(adjustWeeks) : Math.ceil(Math.abs(adjustWeeks));
      startingDate = originalStartDate[addOrSubtract](adjustWeeks, 'w');

      return startingDate;
    }

    // Get & update week states for the week based on the startingDate
    updateWeekData(startingDate, selectedDate = this.state.selectedDate, props = this.props) {
        const me = this;
        let datesForWeek = [];
        let datesAllowedForWeek = [];
        let datesSelectedForWeek = [];
        let datesCustomStylesForWeek = [];

        for (let i=0; i<this.numDaysInWeek; i++) {
          let date;
          if (props.useIsoWeekday) {
            // isoWeekday starts from Monday
            date = me.setLocale(startingDate.clone().isoWeekday(i + 1));
          }
          else {
            date = me.setLocale(startingDate.clone().add(i, 'days'));
          }
          datesForWeek.push(date);
          datesAllowedForWeek.push(this.isDateAllowed(date, props));
          datesSelectedForWeek.push(this.isDateSelected(date, selectedDate));
          datesCustomStylesForWeek.push(this.getCustomDateStyle(date, props));
        }
        return {datesForWeek, datesAllowedForWeek, datesSelectedForWeek, datesCustomStylesForWeek};
    }

    //Handling press on date/selecting date
    onDateSelected(selectedDate) {
        this.setState({ selectedDate, ...this.updateWeekData(this.state.startingDate, selectedDate)});
        this.props.onDateSelected && this.props.onDateSelected(selectedDate);
    }

    // Check whether date is allowed
    isDateAllowed(date, props = this.props) {
      // datesBlacklist entries override datesWhitelist
      if (props.datesBlacklist !== undefined ) {
        for (let disallowed of props.datesBlacklist) {
          // Blacklist start/end object
          if (disallowed.start && disallowed.end) {
            if (date.isBetween(disallowed.start, disallowed.end, 'day', '[]')) {
              return false;
            }
          }
          else {
            if (date.isSame(disallowed, 'day')) {
              return false;
            }
          }
        }
      }

      if (props.datesWhitelist === undefined ) {
        return true;
      }

      // Whitelist
      for (let allowed of props.datesWhitelist) {
        // start/end object
        if (allowed.start && allowed.end) {
          if (date.isBetween(allowed.start, allowed.end, 'day', '[]')) {
            return true;
          }
        }
        else {
          if (date.isSame(allowed, 'day')) {
            return true;
          }
        }
      }
      return false;
    }

    //Function to check if provided date is the same as selected one, hence date is selected
    //using isSame moment query with 'day' param so that it check years, months and day
    isDateSelected(date, selectedDate = this.state.selectedDate) {
        return date.isSame(selectedDate, 'day');
    }

    // Get the currently selected date (Moment JS object)
    getSelectedDate(date) {
        if (this.state.selectedDate.valueOf() === 0) {
          return; // undefined (no date has been selected yet)
        }
        return this.state.selectedDate;
    }

    // Set the selected date.  To clear the currently selected date, pass in 0.
    setSelectedDate(date) {
        let mDate = moment(date);
        this.onDateSelected(mDate);
        // Update week view only if date is not cleared (0).
        if (date !== 0) {
          this.updateWeekStart(mDate);
        }
    }

    getCustomDateStyle(date, props = this.props) {
      for (let customDateStyle of props.customDatesStyles) {
        if (customDateStyle.endDate) {
          // Range
          if (date.isBetween(customDateStyle.startDate, customDateStyle.endDate, 'day', '[]')) {
            return customDateStyle;
          }
        }
        else {
          // Single date
          if (date.isSame(customDateStyle.startDate, 'day')) {
            return customDateStyle;
          }
        }
      }
    }

    //Function for reseting animations
    resetAnimation() {
        this.animatedValue = [];
        for (let i=0; i<this.numDaysInWeek; i++) {
            this.animatedValue.push(new Animated.Value(0));
        }
    }

    //Function to animate showing the CalendarDay elements.
    //Possible cases for animations are sequence and parallel
    animate() {
        if (this.props.calendarAnimation) {
            let animations = [];
            for (let i=0; i<this.numDaysInWeek; i++) {
                animations.push(Animated.timing(
                    this.animatedValue[i],
                    {
                        toValue: 1,
                        duration: this.props.calendarAnimation.duration,
                        easing: Easing.linear
                    }
                )
              );
            }

            if (this.props.calendarAnimation.type.toLowerCase() === 'sequence') {
                Animated.sequence(animations).start();
            } else {
                if (this.props.calendarAnimation.type.toLowerCase() === 'parallel') {
                    Animated.parallel(animations).start();
                } else {
                    throw new Error('CalendarStrip Error! Type of animation is incorrect!');
                }
            }
        }
    }

    render() {
        let datesForWeek = this.state.datesForWeek;
        let datesRender = [];
        for (let i=0; i<datesForWeek.length; i++) {
          let enabled = this.state.datesAllowedForWeek[i];
          let calendarDay = (
            <CalendarDay
                date={datesForWeek[i]}
                selected={this.state.datesSelectedForWeek[i]}
                enabled={enabled}
                showDayName={this.props.showDayName}
                showDayNumber={this.props.showDayNumber}
                onDateSelected={() => enabled && this.onDateSelected(datesForWeek[i]) }
                calendarColor={this.props.calendarColor}
                dateNameStyle={this.props.dateNameStyle}
                dateNumberStyle={this.props.dateNumberStyle}
                weekendDateNameStyle={this.props.weekendDateNameStyle}
                weekendDateNumberStyle={this.props.weekendDateNumberStyle}
                highlightDateNameStyle={this.props.highlightDateNameStyle}
                highlightDateNumberStyle={this.props.highlightDateNumberStyle}
                disabledDateNameStyle={this.props.disabledDateNameStyle}
                disabledDateNumberStyle={this.props.disabledDateNumberStyle}
                disabledDateOpacity={this.props.disabledDateOpacity}
                styleWeekend={this.props.styleWeekend}
                daySelectionAnimation={this.props.daySelectionAnimation}
                customStyle={this.state.datesCustomStylesForWeek[i]}
            />
          );
          datesRender.push( this.props.calendarAnimation ?
            <Animated.View key={i} style={{opacity: this.animatedValue[i], flex: 1}}>
              {calendarDay}
            </Animated.View>
            :
            <View key={i} style={{flex: 1}}>
              {calendarDay}
            </View>
          );
        }

        let calendarHeader = this.props.showMonth && (
            <CalendarHeader
                calendarHeaderFormat={this.props.calendarHeaderFormat}
                calendarHeaderStyle={this.props.calendarHeaderStyle}
                datesForWeek={this.state.datesForWeek}
            />
        );

        // calendarHeader renders above the dates & left/right selectors if dates are shown.
        // However if dates are hidden, the header shows between the left/right selectors.
        return (
            <View style={[styles.calendarContainer, {backgroundColor: this.props.calendarColor}, this.props.style]}>
                { this.props.showDate && calendarHeader }
                <View style={styles.datesStrip}>

                    <WeekSelector
                        controlDate={this.props.minDate}
                        iconComponent={this.props.leftSelector}
                        iconContainerStyle={this.props.iconContainer}
                        iconInstanceStyle={this.props.iconLeftStyle}
                        iconStyle={this.props.iconStyle}
                        imageSource={this.props.iconLeft}
                        onPress={this.getPreviousWeek}
                        weekEndDate={this.state.datesForWeek[this.state.datesForWeek.length - 1]}
                        weekStartDate={this.state.datesForWeek[0]}
                    />

                    { this.props.showDate ?
                      <View style={styles.calendarDates}>
                          {datesRender}
                      </View>
                      :
                      calendarHeader
                    }

                    <WeekSelector
                        controlDate={this.props.maxDate}
                        iconComponent={this.props.rightSelector}
                        iconContainerStyle={this.props.iconContainer}
                        iconInstanceStyle={this.props.iconRightStyle}
                        iconStyle={this.props.iconStyle}
                        imageSource={this.props.iconRight}
                        onPress={this.getNextWeek}
                        weekEndDate={this.state.datesForWeek[this.state.datesForWeek.length - 1]}
                        weekStartDate={this.state.datesForWeek[0]}
                    />

              </View>
            </View>
        );
    }
}
