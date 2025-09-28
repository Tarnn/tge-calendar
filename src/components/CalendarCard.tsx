import { useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventInput, EventClickArg } from "@fullcalendar/core"

// Sample TGE events
const sampleEvents: EventInput[] = [
  {
    id: "1",
    title: "Solana DeFi Launch",
    start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: "#ec4899",
    borderColor: "#ec4899",
  },
  {
    id: "2", 
    title: "Gaming Token TGE",
    start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  {
    id: "3",
    title: "Bridge Protocol",
    start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
  },
  {
    id: "4",
    title: "AI Trading Platform",
    start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  }
]

export function CalendarCard(): JSX.Element {
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  const handleEventClick = (clickInfo: EventClickArg): void => {
    setSelectedEvent({
      title: clickInfo.event.title,
      date: clickInfo.event.start?.toLocaleDateString(),
      id: clickInfo.event.id
    })
  }

  return (
    <>
      {/* Calendar Card - Exact style like Uniswap's swap card */}
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200/20 overflow-hidden">
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Live TGE Calendar
              </h2>
            </div>
            
            <div className="calendar-container">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={sampleEvents}
                eventClick={handleEventClick}
                height="auto"
                headerToolbar={{
                  left: "prev,next",
                  center: "title",
                  right: "today"
                }}
                eventDisplay="block"
                dayMaxEvents={2}
                firstDay={1}
                fixedWeekCount={false}
                aspectRatio={1.3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {selectedEvent.title}
            </h3>
            <p className="text-gray-600 mb-6">
              Date: {selectedEvent.date}
            </p>
            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium py-3 px-4 rounded-xl hover:shadow-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
