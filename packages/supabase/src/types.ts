export type Role = 'customer' | 'owner'
export type BookingStatus = 'active' | 'cancelled' | 'swapped' | 'completed'
export type NotificationType = 'manual' | 'reminder' | 'broadcast'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: Role
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  owner_id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  course_id: string
  day_of_week: number  // 0=Sun … 6=Sat
  start_time: string   // HH:MM:SS
  duration_minutes: number
  instructor_name: string | null
  location: string | null
  capacity: number
  is_active: boolean
  created_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  is_active: boolean
}

export interface Booking {
  id: string
  user_id: string
  lesson_id: string
  date: string  // YYYY-MM-DD
  status: BookingStatus
  is_swap: boolean
  swap_reference_id: string | null
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  created_at: string
}

export interface Notification {
  id: string
  sender_id: string | null
  recipient_id: string | null
  title: string
  body: string
  type: NotificationType
  read_at: string | null
  sent_at: string
}

// Joined types used in UI
export interface LessonWithCourse extends Lesson {
  course: Course
}

export interface BookingWithLesson extends Booking {
  lesson: LessonWithCourse
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course & { lessons: Lesson[] }
}
