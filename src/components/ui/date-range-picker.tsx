"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { addDays } from "date-fns"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// 👉 Props type
interface DateRangePickerProps {
  onDateRangeChange?: (range: { start: Date; end: Date }) => void
}

export function DateRangePicker({ onDateRangeChange }: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  })

  React.useEffect(() => {
    if (date?.from && date?.to && onDateRangeChange) {
      onDateRangeChange({ start: date.from, end: date.to })
    }
  }, [date, onDateRangeChange])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[260px] justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {date.from.toLocaleDateString()} -{" "}
                {date.to.toLocaleDateString()}
              </>
            ) : (
              date.from.toLocaleDateString()
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
