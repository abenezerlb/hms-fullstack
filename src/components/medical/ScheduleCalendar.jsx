

import React, { useState } from "react";

const ScheduleCalendar = ({ onCellClick }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const doctors = [
    { id: 1, name: "Dr. Sarah Johnson", specialty: "Cardiologist", color: "#18181b" },
    { id: 2, name: "Dr. Michael Chen", specialty: "Neurologist", color: "#3f3f46" },
    { id: 3, name: "Dr. Emily Davis", specialty: "Pediatrician", color: "#52525b" },
    { id: 4, name: "Dr. James Wilson", specialty: "Orthopedic", color: "#71717a" },
    { id: 5, name: "Dr. Lisa Anderson", specialty: "Dermatologist", color: "#a1a1aa" },
  ];

  const [appointments] = useState([
    { id: 1, doctorId: 1, dayIndex: 0, patient: "John Smith", time: "9:00 AM", status: "confirmed" },
    { id: 2, doctorId: 1, dayIndex: 2, patient: "Mary Johnson", time: "10:30 AM", status: "pending" },
    { id: 3, doctorId: 2, dayIndex: 1, patient: "Robert Brown", time: "11:00 AM", status: "confirmed" },
    { id: 4, doctorId: 3, dayIndex: 3, patient: "Emma Wilson", time: "2:00 PM", status: "confirmed" },
    { id: 5, doctorId: 4, dayIndex: 4, patient: "David Lee", time: "3:30 PM", status: "pending" },
    { id: 6, doctorId: 2, dayIndex: 0, patient: "Sophie Taylor", time: "9:30 AM", status: "confirmed" },
    { id: 7, doctorId: 5, dayIndex: 2, patient: "Oliver Martin", time: "1:00 PM", status: "confirmed" },
    { id: 8, doctorId: 3, dayIndex: 1, patient: "Ava Garcia", time: "10:00 AM", status: "pending" },
  ]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getWeekDates = () => {
    return days.map((day, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      return {
        day,
        date: date.getDate(),
        month: date.toLocaleString("default", { month: "short" }),
        fullDate: date,
        isToday: isSameDay(date, new Date()),
      };
    });
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const getAppointmentsForCell = (doctorId, dayIndex) => {
    return appointments.filter(
      (apt) => apt.doctorId === doctorId && apt.dayIndex === dayIndex
    );
  };

  const weekDates = getWeekDates();
  const weekRange = `${weekDates[0].month} ${weekDates[0].date} - ${weekDates[6].month} ${weekDates[6].date}, ${weekDates[0].fullDate.getFullYear()}`;

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h2>Weekly Schedule</h2>
        <div className="schedule-nav">
          <button type="button" onClick={() => navigateWeek(-1)}>
            <ChevronLeftIcon />
            Prev
          </button>
          <span className="current-week">{weekRange}</span>
          <button type="button" onClick={() => navigateWeek(1)}>
            Next
            <ChevronRightIcon />
          </button>
          <button type="button" onClick={goToToday}>Today</button>
        </div>
      </div>

      <div className="schedule-grid">
        <div className="grid-header">
          <div className="grid-header-cell">Doctors</div>
          {weekDates.map((dateInfo, index) => (
            <div
              key={index}
              className={`grid-header-cell ${dateInfo.isToday ? "today" : ""}`}
            >
              <div className="day-name">{dateInfo.day}</div>
              <div className="day-date">{dateInfo.date}</div>
            </div>
          ))}
        </div>

        {doctors.map((doctor) => (
          <div key={doctor.id} className="doctor-row">
            <div className="doctor-cell">
              <div
                className="doctor-avatar"
                style={{ backgroundColor: doctor.color }}
              >
                {doctor.name.split(" ")[1]?.charAt(0) || doctor.name.charAt(0)}
              </div>
              <div className="doctor-info">
                <h4>{doctor.name}</h4>
                <span>{doctor.specialty}</span>
              </div>
            </div>

            {days.map((_, dayIndex) => {
              const cellAppointments = getAppointmentsForCell(doctor.id, dayIndex);
              const isToday = weekDates[dayIndex].isToday;

              return (
                <div
                  key={dayIndex}
                  className={`schedule-cell ${isToday ? "today" : ""}`}
                  onClick={() =>
                    onCellClick?.({
                      doctor,
                      date: weekDates[dayIndex].fullDate,
                      dayName: days[dayIndex],
                    })
                  }
                >
                  {cellAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={`appointment-slot ${apt.status}`}
                    >
                      <div className="patient-name">{apt.patient}</div>
                      <div className="appointment-time">{apt.time}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default ScheduleCalendar;
