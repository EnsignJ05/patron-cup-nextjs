// Database types for the Patron Cup Golf application

export type PlayerRole = 'player' | 'committee' | 'admin';
export type PlayerStatus = 'active' | 'inactive' | 'pending';

export interface Player {
  id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  current_handicap: number | null;
  ghin_number: string | null;
  ghin_club: string | null;
  shirt_size: string | null;
  dietary_restrictions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  profile_image_url: string | null;
  bio: string | null;
  role: PlayerRole;
  status: PlayerStatus;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  year: number;
  location_city: string;
  location_state: string;
  resort_name: string | null;
  start_date: string;
  end_date: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  event?: Event;
}

export interface TeamCaptain {
  id: string;
  team_id: string;
  player_id: string;
  is_primary: boolean;
  created_at: string;
  // Joined data
  player?: Player;
  team?: Team;
}

export interface TeamRoster {
  id: string;
  team_id: string;
  player_id: string;
  handicap_at_event: number | null;
  created_at: string;
  // Joined data
  player?: Player;
  team?: Team;
}

export interface Course {
  id: string;
  event_id: string | null;
  name: string;
  resort_name: string | null;
  par: number;
  rating: number | null;
  slope: number | null;
  yardage: number | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  event?: Event;
}

export interface CourseHole {
  id: string;
  course_id: string;
  hole_number: number;
  par: number;
  yardage: number | null;
  handicap_index: number | null;
  created_at: string;
}

export interface Match {
  id: string;
  event_id: string;
  match_number: number;
  group_number: number | null;
  course_id: string | null;
  match_date: string;
  match_time: string | null;
  match_type: string;
  winner_team_id: string | null;
  is_halved: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  event?: Event;
  course?: Course;
  winner_team?: Team;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  handicap_used: number | null;
  is_winner: boolean;
  points_earned: number;
  created_at: string;
  // Joined data
  player?: Player;
  match?: Match;
  team?: Team;
}

export interface RoundScore {
  id: string;
  player_id: string;
  event_id: string;
  course_id: string;
  tee_time_id: string | null;
  round_date: string;
  total_score: number | null;
  front_nine: number | null;
  back_nine: number | null;
  handicap_used: number | null;
  net_score: number | null;
  fairways_hit: number | null;
  greens_in_regulation: number | null;
  putts: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  player?: Player;
  event?: Event;
  course?: Course;
}

export interface HoleScore {
  id: string;
  round_score_id: string;
  hole_number: number;
  strokes: number;
  putts: number | null;
  fairway_hit: boolean | null;
  gir: boolean | null;
  sand_save: boolean | null;
  penalty_strokes: number;
  created_at: string;
}

export interface TravelInfo {
  id: string;
  player_id: string;
  event_id: string;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_flight_number: string | null;
  arrival_airline: string | null;
  arrival_airport: string | null;
  arrival_notes: string | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_flight_number: string | null;
  departure_airline: string | null;
  departure_airport: string | null;
  departure_notes: string | null;
  needs_transportation: boolean;
  rental_car_info: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  player?: Player;
  event?: Event;
}

export interface Lodging {
  id: string;
  event_id: string;
  building_name: string | null;
  room_number: string | null;
  room_type: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  bedrooms: number | null;
  num_of_people: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  event?: Event;
}

export interface LodgingAssignment {
  id: string;
  lodging_id: string;
  player_id: string;
  is_primary: boolean;
  confirmation_num: string | null;
  created_at: string;
  // Joined data
  lodging?: Lodging;
  player?: Player;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  player_id: string;
  handicap_at_event: number | null;
  is_confirmed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  event?: Event;
  player?: Player;
}

export interface Reround {
  id: string;
  event_id: string;
  course_id: string;
  reround_date: string;
  reround_time: string | null;
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  event?: Event;
  course?: Course;
}

export interface ReroundSignup {
  id: string;
  reround_id: string;
  player_id: string;
  signup_date: string;
  status: string;
  created_at: string;
  // Joined data
  reround?: Reround;
  player?: Player;
}
