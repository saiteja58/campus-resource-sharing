import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "../context/EventContext";
import { Event } from "../types";

const CreateEvent: React.FC = () => {
  const [event, setEvent] = useState<Event>({
  id: 0,
  name: "",
  venue: "",
  description: "",
  image: "",
  registrationLink: "",
  eventDate: "", // ✅ NEW
});

  const { addEvent } = useEvents();
  const navigate = useNavigate();

  const handleSubmit = () => {
    addEvent({ ...event, id: Date.now() });
    navigate("/events");
  };

  return (
    <div style={{ display: "flex", gap: 40, padding: 20 }}>
      {/* FORM */}
      <div style={{ width: "50%" }}>
        <h2>Create Event</h2>

        <input
          placeholder="Event Name"
          onChange={(e) => setEvent({ ...event, name: e.target.value })}
        />
        <br /><br />

        <input
          placeholder="Venue"
          onChange={(e) => setEvent({ ...event, venue: e.target.value })}
        />
        <br /><br />

        <input
  type="date"
  onChange={(e) =>
    setEvent({ ...event, eventDate: e.target.value })
  }
/>
<br /><br />


        <input
          placeholder="Registration Link (https://...)"
          onChange={(e) =>
            setEvent({ ...event, registrationLink: e.target.value })
          }
        />
        <br /><br />

        <textarea
          placeholder="Description"
          onChange={(e) =>
            setEvent({ ...event, description: e.target.value })
          }
        />
        <br /><br />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setEvent({
              ...event,
              image: URL.createObjectURL(file),
            });
          }}
        />
        <br /><br />

        <button
  onClick={handleSubmit}
  className="mt-4 bg-indigo-600 text-white px-8 py-4 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
>
  Post Event
</button>

      </div>

      {/* PREVIEW */}
<div style={{ width: "50%", border: "1px solid #ccc", padding: 20 }}>
  <h3>Preview</h3>

  {event.image && <img src={event.image} width="100%" />}

  <h4>{event.name}</h4>

  <p><b>Venue:</b> {event.venue}</p>

  {event.eventDate && (
    <p><b>Date:</b> {event.eventDate}</p>
  )}

  <p>{event.description}</p>

  {event.registrationLink && (
    <p><b>Registration:</b> {event.registrationLink}</p>
  )}
</div>

    </div>
  );
};

export default CreateEvent;
