import { useParams } from "react-router-dom";
import { useEvents } from "../context/EventContext";

const EventDetails = () => {
  const { id } = useParams();
  const { events } = useEvents();

  const event = events.find((e) => e.id === Number(id));

  if (!event) return <p>Event not found</p>;

  return (
    <div style={{ padding: 20 }}>
      <img src={event.image} width="400" />
      <h2>{event.name}</h2>
      <p><b>Venue:</b> {event.venue}</p>
      <p>{event.description}</p>

      <button>Register</button>
    </div>
  );
};

export default EventDetails;
