// 공통 응답 규격
export interface ApiResponse<T = any> {
  success: boolean;
  code: string;
  message?: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

// User & Auth
export interface UserMeResponse {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'GUEST' | 'HOST' | 'ADMIN';
  birthDate?: string;
  createdAt: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface TermItem {
  id: number;
  title: string;
  content: string;
  required: boolean;
  version: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  birthDate: string; // YYYY-MM-DD
  agreedTermIds: number[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateMeRequest {
  name?: string;
  phone?: string;
}

// Host
export interface HostRegisterRequest {
  businessName: string;
  businessRegistrationNo: string;
}

export interface HostBusinessResponse {
  id: number;
  businessName: string;
  businessRegistrationNo: string;
  approvalStatus: string;
  createdAt: string;
}

export interface HostRegisterResponse {
  business: HostBusinessResponse;
  accessToken: string;
  accessTokenExpiresIn: number;
}

// Accommodation & Room
export interface RegionResponse {
  id: number;
  parentId: number | null;
  name: string;
  level: number;
}

export interface AmenityResponse {
  id: number;
  name: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
}

export interface AccommodationSummary {
  id: number;
  name: string;
  address: string;
  regionId: number;
  regionName: string;
  categoryId: number;
  categoryName: string;
  thumbnailUrl: string | null;
  minNightlyPrice: number | null;
}

export interface RoomResponse {
  id: number;
  name: string;
  capacity: number;
  maxCapacity: number;
  extraPersonFee: number;
  nightlyPrice: number;
  status: 'ACTIVE' | 'INACTIVE';
  imageUrls: string[];
}

export interface RefundRule {
  daysBefore: number;
  refundRate: number; // 0.00 ~ 1.00
}

export interface RefundPolicyResponse {
  id: number;
  version: string;
  policyText: string;
  rules: RefundRule[];
}

export type ListingStatus = 'DRAFT' | 'LISTED' | 'HIDDEN';

export interface HostAccommodationSummary {
  id: number;
  name: string;
  address: string;
  regionId: number;
  regionName: string;
  categoryId: number;
  categoryName: string;
  thumbnailUrl: string | null;
  listingStatus: ListingStatus;
  roomCount: number;
  activeRoomCount: number;
  hasRefundPolicy: boolean;
  readyToList: boolean;
}

export interface ListingStatusRequest {
  listingStatus: ListingStatus;
}

export interface AccommodationDetail {
  id: number;
  name: string;
  description: string;
  address: string;
  regionId: number;
  regionName: string;
  categoryId: number;
  categoryName: string;
  latitude: number;
  longitude: number;
  checkInTime: string;
  checkOutTime: string;
  listingStatus: ListingStatus;
  imageUrls: string[];
  amenities: AmenityResponse[];
  rooms: RoomResponse[];
  refundPolicy: RefundPolicyResponse | null;
}

export interface AccommodationCreateRequest {
  regionId: number;
  categoryId: number;
  name: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  checkInTime: string; // HH:mm:ss
  checkOutTime: string; // HH:mm:ss
  imageUrls?: string[];
  amenityIds?: number[];
}

export interface AccommodationUpdateRequest {
  regionId?: number;
  categoryId?: number;
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  checkInTime?: string;
  checkOutTime?: string;
  imageUrls?: string[];
  amenityIds?: number[];
  listingStatus?: 'LISTED' | 'UNLISTED';
}

export interface RoomCreateRequest {
  name: string;
  capacity: number;
  maxCapacity: number;
  extraPersonFee: number;
  nightlyPrice: number;
  imageUrls?: string[];
}

export interface RoomUpdateRequest {
  name?: string;
  capacity?: number;
  maxCapacity?: number;
  extraPersonFee?: number;
  nightlyPrice?: number;
  imageUrls?: string[];
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface RefundPolicyRequest {
  policyText?: string;
  rules: RefundRule[];
}

// Inventory
export interface RoomAvailability {
  roomId: number;
  roomName: string;
  capacity: number;
  maxCapacity: number;
  extraPersonFee: number;
  nights: number;
  available: boolean;
  totalPrice: number | null;
}

export interface SetInventoriesRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalCount?: number;
  price?: number;
  closed?: boolean;
}

export interface InventoryResponse {
  stayDate: string;
  totalCount: number;
  bookedCount: number;
  heldCount: number;
  price: number;
  closed: boolean;
}

// Reservation
export interface PriceItemResponse {
  itemType: string;
  name: string;
  amount: number;
}

export interface ReservationCreateRequest {
  roomId: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guestCount: number;
  guestName?: string;
  guestPhone?: string;
}

export interface ReservationResponse {
  id: number;
  reservationNo: string;
  accommodationId: number;
  accommodationName: string;
  roomId: number;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
  guestPhone: string;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  holdExpiresAt?: string;
  cancelledAt?: string;
  createdAt: string;
  priceItems: PriceItemResponse[];
  refundPolicy?: any;
}

export interface ReservationCancelResponse {
  reservation: ReservationResponse;
  refundRate: number | null;
  refundAmount: number;
  penaltyAmount: number;
}

// Payment
export interface PaymentPrepareRequest {
  reservationId: number;
}

export interface PaymentPrepareResponse {
  orderId: string;
  amount: number;
  orderName: string;
  pgProvider: string;
}

export interface PaymentConfirmRequest {
  orderId: string;
  paymentKey: string;
  amount: number;
}

export interface PaymentResponse {
  orderId: string;
  reservationId: number;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
}

// Favorite
export interface FavoriteResponse {
  id: number;
  accommodationId: number;
  accommodationName: string;
  address: string;
  thumbnailUrl: string | null;
  minNightlyPrice: number | null;
  createdAt: string;
}

// Review
export interface ReviewCreateRequest {
  reservationId: number;
  rating: number; // 1~5
  content: string;
  spotifyTrackId?: string;
  imageUrls?: string[];
}

export interface ReviewUpdateRequest {
  rating?: number;
  content?: string;
  spotifyTrackId?: string;
  removeSpotifyTrack?: boolean;
  imageUrls?: string[];
}

export interface ReviewReplyRequest {
  reply: string;
}

export interface ReviewResponse {
  id: number;
  accommodationId: number;
  authorName: string;
  rating: number;
  content: string;
  spotifyTrackId: string | null;
  imageUrls: string[];
  hostReply: string | null;
  hostRepliedAt: string | null;
  createdAt: string;
}

export interface AccommodationTrackResponse {
  spotifyTrackId: string;
  reviewCount: number;
  lastAddedAt: string;
}

// Spotify Track
export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  durationMs: number;
}

// API Logger Log Item
export interface ApiLogItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  requestHeaders?: Record<string, any>;
  requestData?: any;
  status?: number;
  statusText?: string;
  responseData?: any;
  durationMs: number;
  error?: boolean;
}
