// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { MarketClock } from "../src/MarketClock.sol";

contract MarketClockTest is Test {
    function utc(uint256 y, uint256 m, uint256 d, uint256 hh, uint256 mm) internal pure returns (uint256) {
        return MarketClock.daysFromCivil(y, m, d) * 1 days + hh * 1 hours + mm * 1 minutes;
    }

    function test_epochAnchor() public pure {
        // 2026-10-06 00:00 UTC, the open time of a Binance daily candle.
        assertEq(utc(2026, 10, 6, 0, 0), 1791244800);
        assertEq(MarketClock.daysFromCivil(1970, 1, 1), 0);
    }

    function testFuzz_civilRoundTrip(uint256 day) public pure {
        day = bound(day, 0, 200_000);
        (uint256 y, uint256 m, uint256 d) = MarketClock.civilFromDays(day);
        assertEq(MarketClock.daysFromCivil(y, m, d), day);
    }

    function test_dstBoundaries2026() public pure {
        // DST starts Sun Mar 8 2026 at 07:00 UTC and ends Sun Nov 1 2026 at 06:00 UTC.
        assertFalse(MarketClock.isDst(utc(2026, 3, 8, 6, 59)));
        assertTrue(MarketClock.isDst(utc(2026, 3, 8, 7, 0)));
        assertTrue(MarketClock.isDst(utc(2026, 11, 1, 5, 59)));
        assertFalse(MarketClock.isDst(utc(2026, 11, 1, 6, 0)));
    }

    function test_regularFridayWindowDuringDst() public pure {
        // Fri Oct 2 2026 closes at 16:00 EDT = 20:00 UTC.
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 10, 2, 18, 59)));
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 10, 2, 19, 0)));
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 10, 2, 19, 59)));
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 10, 2, 20, 0)));
    }

    function test_noWindowOnOrdinaryWeekdays() public pure {
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 10, 1, 19, 30))); // Thursday
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 10, 5, 19, 30))); // Monday
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 10, 3, 19, 30))); // Saturday
    }

    function test_fridayWindowDuringStandardTime() public pure {
        // Fri Nov 13 2026 closes at 16:00 EST = 21:00 UTC.
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 11, 13, 19, 30)));
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 11, 13, 20, 30)));
    }

    function test_dayBeforeHolidays() public pure {
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 4, 2, 19, 30))); // before Good Friday
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 7, 2, 19, 30))); // before Jul 3
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 11, 25, 20, 30))); // before Thanksgiving
        assertTrue(MarketClock.inPreCloseWindow(utc(2027, 3, 25, 19, 30))); // before Good Friday 2027
    }

    function test_earlyCloses() public pure {
        // Fri Nov 27 2026 and Thu Dec 24 2026 close at 13:00 EST = 18:00 UTC.
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 11, 27, 17, 30)));
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 11, 27, 18, 0)));
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 11, 27, 20, 30)));
        assertTrue(MarketClock.inPreCloseWindow(utc(2026, 12, 24, 17, 30)));
        assertTrue(MarketClock.inPreCloseWindow(utc(2027, 11, 26, 17, 30)));
    }

    function test_holidaysAreClosed() public pure {
        assertFalse(MarketClock.isOpen(utc(2026, 12, 25, 15, 0)));
        assertFalse(MarketClock.isOpen(utc(2026, 7, 3, 15, 0)));
        assertFalse(MarketClock.isOpen(utc(2027, 7, 5, 15, 0)));
        assertFalse(MarketClock.inPreCloseWindow(utc(2026, 12, 25, 20, 30)));
    }

    function test_isOpenRegularSession() public pure {
        // Tue Oct 6 2026 opens at 09:30 EDT = 13:30 UTC.
        assertFalse(MarketClock.isOpen(utc(2026, 10, 6, 13, 29)));
        assertTrue(MarketClock.isOpen(utc(2026, 10, 6, 13, 30)));
        assertTrue(MarketClock.isOpen(utc(2026, 10, 6, 19, 59)));
        assertFalse(MarketClock.isOpen(utc(2026, 10, 6, 20, 0)));
        assertFalse(MarketClock.isOpen(utc(2026, 10, 3, 15, 0))); // Saturday
    }

    function test_weekendsStillWorkAfterCalendarEnds() public pure {
        // Fri Jan 7 2028 is outside the holiday table; the weekend window still applies.
        assertTrue(MarketClock.inPreCloseWindow(utc(2028, 1, 7, 20, 30)));
        assertFalse(MarketClock.inPreCloseWindow(utc(2028, 1, 6, 20, 30)));
    }
}
