// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title MarketClock
/// @notice NYSE session math done fully on-chain: US Eastern time with DST, the 2026 and 2027
///         holiday calendar, early closes, and the pre-close window before a multi-day close.
/// @dev Holidays are only known for 2026 and 2027. Outside those years only weekends count as
///      closed days. Dates are compared as YYYYMMDD integers to keep the table readable.
library MarketClock {
    uint256 internal constant PRE_CLOSE_WINDOW = 60 minutes;

    uint256 private constant REGULAR_CLOSE = 16 hours;
    uint256 private constant EARLY_CLOSE = 13 hours;
    uint256 private constant EST_OFFSET = 5 hours;
    uint256 private constant EDT_OFFSET = 4 hours;

    /// @notice True during the last `PRE_CLOSE_WINDOW` of a session that is followed by at least
    ///         one full closed day (a weekend, a holiday, or both).
    function inPreCloseWindow(uint256 ts) internal pure returns (bool) {
        uint256 local = toEastern(ts);
        uint256 day = local / 1 days;
        if (!isTradingDay(day) || isTradingDay(day + 1)) return false;

        uint256 secondOfDay = local % 1 days;
        uint256 close = closeTime(day);
        return secondOfDay >= close - PRE_CLOSE_WINDOW && secondOfDay < close;
    }

    /// @notice True while the regular session (09:30 ET to the close) is running.
    function isOpen(uint256 ts) internal pure returns (bool) {
        uint256 local = toEastern(ts);
        uint256 day = local / 1 days;
        if (!isTradingDay(day)) return false;

        uint256 secondOfDay = local % 1 days;
        return secondOfDay >= 9 hours + 30 minutes && secondOfDay < closeTime(day);
    }

    /// @notice Converts a UTC timestamp to US Eastern wall-clock seconds since the epoch.
    function toEastern(uint256 ts) internal pure returns (uint256) {
        return ts - (isDst(ts) ? EDT_OFFSET : EST_OFFSET);
    }

    /// @notice US DST runs from 02:00 local on the second Sunday of March to 02:00 local on the
    ///         first Sunday of November.
    function isDst(uint256 ts) internal pure returns (bool) {
        (uint256 year,,) = civilFromDays(ts / 1 days);
        uint256 start = (_firstSunday(year, 3) + 7) * 1 days + 2 hours + EST_OFFSET;
        uint256 end = _firstSunday(year, 11) * 1 days + 2 hours + EDT_OFFSET;
        return ts >= start && ts < end;
    }

    /// @param day Days since 1970-01-01 in Eastern wall-clock time.
    function isTradingDay(uint256 day) internal pure returns (bool) {
        uint256 weekday = (day + 4) % 7; // 0 = Sunday, 1970-01-01 was a Thursday
        if (weekday == 0 || weekday == 6) return false;
        return !isHoliday(_ymd(day));
    }

    /// @param day Days since 1970-01-01 in Eastern wall-clock time.
    function closeTime(uint256 day) internal pure returns (uint256) {
        return isEarlyClose(_ymd(day)) ? EARLY_CLOSE : REGULAR_CLOSE;
    }

    /// @dev Source: nyse.com/markets/hours-calendars, checked on 2026-10-06.
    function isHoliday(uint256 ymd) internal pure returns (bool) {
        if (ymd < 20260101 || ymd > 20271231) return false;
        if (ymd < 20270101) {
            return ymd == 20260101 || ymd == 20260119 || ymd == 20260216 || ymd == 20260403
                || ymd == 20260525 || ymd == 20260619 || ymd == 20260703 || ymd == 20260907
                || ymd == 20261126 || ymd == 20261225;
        }
        return ymd == 20270101 || ymd == 20270118 || ymd == 20270215 || ymd == 20270326
            || ymd == 20270531 || ymd == 20270618 || ymd == 20270705 || ymd == 20270906
            || ymd == 20271125 || ymd == 20271224;
    }

    /// @dev Sessions that close at 13:00 ET.
    function isEarlyClose(uint256 ymd) internal pure returns (bool) {
        return ymd == 20261127 || ymd == 20261224 || ymd == 20271126;
    }

    /// @notice Howard Hinnant's days_from_civil, restricted to dates after 1970.
    function daysFromCivil(uint256 year, uint256 month, uint256 dayOfMonth) internal pure returns (uint256) {
        if (month <= 2) year -= 1;
        uint256 era = year / 400;
        uint256 yearOfEra = year - era * 400;
        uint256 shiftedMonth = month > 2 ? month - 3 : month + 9;
        uint256 dayOfYear = (153 * shiftedMonth + 2) / 5 + dayOfMonth - 1;
        uint256 dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear;
        return era * 146097 + dayOfEra - 719468;
    }

    /// @notice Howard Hinnant's civil_from_days, restricted to dates after 1970.
    function civilFromDays(uint256 day) internal pure returns (uint256 year, uint256 month, uint256 dayOfMonth) {
        uint256 z = day + 719468;
        uint256 era = z / 146097;
        uint256 dayOfEra = z - era * 146097;
        uint256 yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365;
        uint256 dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100);
        uint256 shiftedMonth = (5 * dayOfYear + 2) / 153;
        dayOfMonth = dayOfYear - (153 * shiftedMonth + 2) / 5 + 1;
        month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
        year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
    }

    function _ymd(uint256 day) private pure returns (uint256) {
        (uint256 year, uint256 month, uint256 dayOfMonth) = civilFromDays(day);
        return year * 10000 + month * 100 + dayOfMonth;
    }

    function _firstSunday(uint256 year, uint256 month) private pure returns (uint256) {
        uint256 first = daysFromCivil(year, month, 1);
        return first + (7 - (first + 4) % 7) % 7;
    }
}
