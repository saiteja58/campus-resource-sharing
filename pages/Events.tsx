import { useNavigate } from "react-router-dom";
import { useEvents } from "../context/EventContext";

const Events: React.FC = () => {
  const { events } = useEvents();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black text-slate-900">Events</h2>

        <button
          onClick={() => navigate("/events/create")}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all"
        >
          Post an Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-32 opacity-40">
          <p className="text-sm font-black uppercase tracking-widest">
            No events available
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow border cursor-pointer hover:shadow-lg transition"
              onClick={() => {
                if (event.registrationLink) {
                  window.open(event.registrationLink, "_blank");
                } else {
                  alert("Registration link not available");
                }
              }}
            >
              <img
                src={event.image}
                alt={event.name}
                className="w-full h-[320px] object-cover rounded-t-xl"
              />

              <div className="p-4 space-y-2">
                <p className="text-sm">
                  <b>Event Name:</b>{" "}
                  <span className="font-medium">{event.name}</span>
                </p>

                <p className="text-sm">
                  <b>Venue:</b>{" "}
                  <span className="font-medium">{event.venue}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;
