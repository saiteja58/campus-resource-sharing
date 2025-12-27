import { useNavigate } from "react-router-dom";
import { Event } from "../types";

interface Props {
  event: Event;
}

const EventCard: React.FC<Props> = ({ event }) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: 250,
        border: "1px solid #ddd",
        borderRadius: 8,
        cursor: "pointer",
        overflow: "hidden",
      }}
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <img src={event.image} alt={event.name} width="100%" height="150" />
      <div style={{ padding: 10 }}>
        <h4>{event.name}</h4>
        <p>{event.venue}</p>
      </div>
    </div>
  );
};

export default EventCard;
