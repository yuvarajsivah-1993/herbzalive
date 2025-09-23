import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
// FIX: Import the 'Button' component to resolve 'Cannot find name' errors.
import Button from './Button';

// Date utilities
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Assuming Sunday is the first day of the week (0)
  return new Date(d.setDate(diff));
};
const endOfWeek = (date: Date) => {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
};
const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};
const isSameDay = (d1: Date | null, d2: Date | null) => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const presets = [
  { label: 'Today', getRange: () => { const d = new Date(); d.setHours(0,0,0,0); return { start: d, end: d }; } },
  { label: 'Yesterday', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); return { start: d, end: d }; } },
  { label: 'This Week', getRange: () => { const today = new Date(); today.setHours(0,0,0,0); return { start: startOfWeek(today), end: today }; } },
  { label: 'Last Week', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return { start: startOfWeek(d), end: endOfWeek(d) }; } },
  { label: 'This Month', getRange: () => { const today = new Date(); today.setHours(0,0,0,0); return { start: startOfMonth(today), end: today }; } },
  { label: 'Last Month', getRange: () => { const d = addMonths(new Date(), -1); d.setHours(0,0,0,0); return { start: startOfMonth(d), end: endOfMonth(d) }; } },
];

const CalendarMonth: React.FC<{
    viewDate: Date;
    range: { start: Date | null, end: Date | null };
    onDateClick: (date: Date) => void;
    hoveredDate: Date | null;
    onDateHover: (date: Date | null) => void;
}> = ({ viewDate, range, onDateClick, hoveredDate, onDateHover }) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const getDayClass = (day: number) => {
        const date = new Date(year, month, day);
        date.setHours(0,0,0,0);
        let classes = "w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors duration-150";

        const isStart = isSameDay(date, range.start);
        const isEnd = isSameDay(date, range.end);
        const inRange = range.start && range.end && date > range.start && date < range.end;
        const inHoverRange = range.start && !range.end && hoveredDate && (
            (date > range.start && date <= hoveredDate) || (date < range.start && date >= hoveredDate)
        );

        if (isStart || isEnd) {
            classes += " bg-blue-600 text-white font-semibold";
        } else if (inRange || inHoverRange) {
            classes += " bg-blue-100 dark:bg-blue-900/50 text-slate-800 dark:text-slate-200";
        } else {
            classes += " text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer";
        }
        
        if (isSameDay(date, new Date())) {
            if (!isStart && !isEnd) classes += " ring-1 ring-blue-600";
        }

        return classes;
    };

    return (
        <div className="p-2 w-64">
            <div className="text-center font-semibold text-slate-800 dark:text-slate-200">{MONTH_NAMES[month]} {year}</div>
            <div className="grid grid-cols-7 gap-1 mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                {DAYS_SHORT.map(day => <div key={day} className="w-9 h-9 flex items-center justify-center">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 mt-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month, day);
                    date.setHours(0,0,0,0);
                    return (
                        <div key={i} className="flex justify-center" onMouseEnter={() => onDateHover(date)} onMouseLeave={() => onDateHover(null)}>
                            <button type="button" onClick={() => onDateClick(date)} className={getDayClass(day)}>
                                {day}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface DateRangePickerProps {
    value: { start: Date, end: Date };
    onChange: (range: { start: Date, end: Date }) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempRange, setTempRange] = useState<{ start: Date | null, end: Date | null }>(value);
    const [viewDate, setViewDate] = useState(value.end || new Date());
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTempRange(value);
            setViewDate(value.end || new Date());
        }
    }, [value, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateClick = (clickedDate: Date) => {
        if (!tempRange.start || tempRange.end) {
            setTempRange({ start: clickedDate, end: null });
        } else {
            if (clickedDate < tempRange.start) {
                setTempRange({ start: clickedDate, end: tempRange.start });
            } else {
                setTempRange({ start: tempRange.start, end: clickedDate });
            }
        }
    };
    
    const handlePresetClick = (preset: typeof presets[0]) => {
        const { start, end } = preset.getRange();
        setTempRange({ start, end });
        setViewDate(end);
    };

    const handleApply = () => {
        if (tempRange.start && tempRange.end) {
            onChange(tempRange as { start: Date, end: Date });
        } else if(tempRange.start) { // Single day selected
            onChange({ start: tempRange.start, end: tempRange.start });
        }
        setIsOpen(false);
    };

    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date Range</label>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <span>{`${formatDate(value.start)} → ${formatDate(value.end)}`}</span>
                <FontAwesomeIcon icon={faCalendarDays} className="text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl flex flex-col sm:flex-row">
                    <div className="flex p-2 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800">
                        <button onClick={() => setViewDate(addMonths(viewDate, -1))} className="p-2 self-start mt-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faChevronLeft}/></button>
                        <CalendarMonth viewDate={addMonths(viewDate, -1)} range={tempRange} onDateClick={handleDateClick} hoveredDate={hoveredDate} onDateHover={setHoveredDate} />
                        <div className="border-r border-slate-200 dark:border-slate-800 mx-1"></div>
                        <CalendarMonth viewDate={viewDate} range={tempRange} onDateClick={handleDateClick} hoveredDate={hoveredDate} onDateHover={setHoveredDate} />
                        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 self-start mt-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faChevronRight}/></button>
                    </div>
                    <div className="p-4 flex flex-col w-full sm:w-48">
                        <div className="flex-grow space-y-1">
                            {presets.map(p => (
                                <button key={p.label} onClick={() => handlePresetClick(p)} className="w-full text-left px-3 py-1.5 rounded text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">{p.label}</button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <Button size="sm" variant="primary" onClick={handleApply}>Apply</Button>
                            <Button size="sm" variant="light" onClick={() => setIsOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;