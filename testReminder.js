const data = {
  eventDate: "2026-10-23",
  eventTime: "14:00",
  dateType: "event",
};

const event = new Date(`${data.eventDate}T${data.eventTime}:00`);
const reminder = new Date(event.getTime() - 60 * 60 * 1000);

console.log("Event:", event.toLocaleString());
console.log("Reminder:", reminder.toLocaleString());
console.log("Is reminder in the future?", reminder > new Date());
