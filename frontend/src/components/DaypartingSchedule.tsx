import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Chip,
  Button,
  IconButton,
} from '@mui/material';
import { Add, Delete, ContentCopy } from '@mui/icons-material';

interface TimeSlot {
  start: number;
  end: number;
}

interface DaySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

interface DaypartingScheduleProps {
  value: DaySchedule;
  onChange: (schedule: DaySchedule) => void;
}

const DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const DaypartingSchedule: React.FC<DaypartingScheduleProps> = ({ value, onChange }) => {
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [selectedHours, setSelectedHours] = useState<number[]>([]);

  const handleDayChange = (event: React.MouseEvent<HTMLElement>, newDay: string) => {
    if (newDay) {
      setSelectedDay(newDay);
      const daySlots = value[newDay as keyof DaySchedule] || [];
      const hours: number[] = [];
      daySlots.forEach(slot => {
        for (let i = slot.start; i < slot.end; i++) {
          hours.push(i);
        }
      });
      setSelectedHours(hours);
    }
  };

  const handleHourToggle = (hour: number) => {
    const newHours = selectedHours.includes(hour)
      ? selectedHours.filter(h => h !== hour)
      : [...selectedHours, hour].sort((a, b) => a - b);
    
    setSelectedHours(newHours);
    
    // Convert hours to time slots
    const slots: TimeSlot[] = [];
    if (newHours.length > 0) {
      let start = newHours[0];
      let end = newHours[0] + 1;
      
      for (let i = 1; i < newHours.length; i++) {
        if (newHours[i] === end) {
          end++;
        } else {
          slots.push({ start, end });
          start = newHours[i];
          end = newHours[i] + 1;
        }
      }
      slots.push({ start, end });
    }
    
    onChange({
      ...value,
      [selectedDay]: slots.length > 0 ? slots : undefined
    });
  };

  const copyToAllDays = () => {
    const currentDaySlots = value[selectedDay as keyof DaySchedule];
    const newSchedule: DaySchedule = {};
    DAYS.forEach(day => {
      newSchedule[day as keyof DaySchedule] = currentDaySlots;
    });
    onChange(newSchedule);
  };

  const copyToWeekdays = () => {
    const currentDaySlots = value[selectedDay as keyof DaySchedule];
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const newSchedule = { ...value };
    weekdays.forEach(day => {
      newSchedule[day as keyof DaySchedule] = currentDaySlots;
    });
    onChange(newSchedule);
  };

  const clearDay = () => {
    const newSchedule = { ...value };
    delete newSchedule[selectedDay as keyof DaySchedule];
    onChange(newSchedule);
    setSelectedHours([]);
  };

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  const formatTimeSlot = (slot: TimeSlot) => {
    return `${formatTime(slot.start)} - ${formatTime(slot.end)}`;
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Ad Schedule (Dayparting)
      </Typography>
      <Typography variant="caption" color="text.secondary" gutterBottom>
        Select specific hours when your ads will run each day
      </Typography>
      
      <Paper sx={{ p: 2, mt: 2 }}>
        {/* Day selector */}
        <ToggleButtonGroup
          value={selectedDay}
          exclusive
          onChange={handleDayChange}
          size="small"
          fullWidth
        >
          {DAYS.map(day => (
            <ToggleButton key={day} value={day}>
              <Box>
                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                  {day.substring(0, 3)}
                </Typography>
                {value[day as keyof DaySchedule] && (
                  <Chip 
                    size="small" 
                    label={value[day as keyof DaySchedule]?.length || 0}
                    sx={{ ml: 0.5, height: 16, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Quick actions */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<ContentCopy />} onClick={copyToAllDays}>
            Copy to All Days
          </Button>
          <Button size="small" startIcon={<ContentCopy />} onClick={copyToWeekdays}>
            Copy to Weekdays
          </Button>
          <Button size="small" startIcon={<Delete />} onClick={clearDay} color="error">
            Clear Day
          </Button>
        </Box>

        {/* Hour selector grid */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            Click hours to toggle (selected hours will run ads):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {HOURS.map(hour => (
              <Box key={hour} sx={{ flex: '0 0 auto' }}>
                <ToggleButton
                  value={hour}
                  selected={selectedHours.includes(hour)}
                  onChange={() => handleHourToggle(hour)}
                  size="small"
                  sx={{ 
                    minWidth: '60px',
                    p: 0.5,
                    fontSize: '0.75rem'
                  }}
                >
                  {formatTime(hour)}
                </ToggleButton>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Current schedule display */}
        {value[selectedDay as keyof DaySchedule] && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Active time slots for {selectedDay}:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {value[selectedDay as keyof DaySchedule]?.map((slot, index) => (
                <Chip
                  key={index}
                  label={formatTimeSlot(slot)}
                  color="primary"
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DaypartingSchedule;