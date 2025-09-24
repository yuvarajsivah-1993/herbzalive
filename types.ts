// FIX: Update Firebase type imports for v8 compatibility.
import type firebase from 'firebase/compat/app';

export type FirebaseUser = firebase.User;
export type Timestamp = firebase.firestore.Timestamp;

export type PermissionLevel = 'none' | 'read' | 'write';

// A mapping of module keys to their permission levels.
// These keys are derived from the route paths.
// FIX: Add 'medicines' to AppModules to support the Medicines screen.
export type AppModules = 'dashboard' | 'reservations' | 'patients' | 'treatments' | 'staff' | 'accounts' | 'sales' | 'expenses' | 'stocks' | 'peripherals' | 'report' | 'appointments' | 'doctors' | 'profile' | 'hospital-settings' | 'invoice-settings' | 'tax-rates' | 'medicines' | 'pos' | 'pos-sales' | 'notifications' | 'vendors' | 'payroll' | 'payroll-settings';

export type Permissions = Record<AppModules, PermissionLevel>;

export interface Address {
  street: string;
  city: string;
  state?: string;
  country: string;
  pincode: string;
}

export interface SubscriptionPackage {
    id?: string;
    name: string;
    description: string;
    prices: {
        monthly: number;
        quarterly: number;
        yearly: number;
    };
    maxUsers: number; // 0 for infinite
    maxDoctors: number; // 0 for infinite
    maxPatients: number; // 0 for infinite
    maxProducts: number; // 0 for infinite
    maxTreatments: number; // 0 for infinite
    maxReservationsPerMonth: number; // 0 for infinite
    maxSalesPerMonth: number; // 0 for infinite
    maxExpensesPerMonth: number; // 0 for infinite
}

export interface NewSubscriptionPackageData extends Omit<SubscriptionPackage, 'id'> {}

export interface NotificationTemplate {
    subject: string;
    body: string;
}

export interface WelcomeMessageSetting {
    enabled: boolean;
    template: NotificationTemplate;
}

export interface AppointmentReminderSetting {
    enabled: boolean;
    daysBefore: number;
    time: string; // e.g., "09:00"
    template: NotificationTemplate;
}

export interface InvoiceSetting {
    enabled: boolean;
    template: NotificationTemplate;
}

export interface BirthdayWishSetting {
    enabled: boolean;
    template: NotificationTemplate;
}

export interface NotificationSettings {
    welcomeMessage: WelcomeMessageSetting;
    appointmentReminder: AppointmentReminderSetting;
    posSaleInvoice: InvoiceSetting;
    treatmentInvoice: InvoiceSetting;
    birthdayWish: BirthdayWishSetting;
}

export type PrinterType = 'A4' | 'thermal';
export type A4Design = 'modern' | 'classic' | 'simple' | 'colorful' | 'minimal';
export type ThermalDesign = 'receipt';

export interface IndividualInvoiceSettings {
  prefix: string;
  nextNumber: number;
  footerText: string;
  emailTemplate: NotificationTemplate;
  printerType: PrinterType;
  design: A4Design | ThermalDesign;
}

export interface InvoiceSettingsData {
  treatmentInvoice: IndividualInvoiceSettings;
  posInvoice: IndividualInvoiceSettings;
}

export type EmailProvider = 'default' | 'smtp' | 'sendgrid' | 'mailgun';

export interface SMTPSettings {
    server: string;
    port: number;
    username: string;
    password?: string;
    encryption: 'none' | 'ssl_tls' | 'starttls';
}

export interface EmailSettings {
    provider: EmailProvider;
    fromEmail: string;
    smtp?: SMTPSettings;
    apiKey?: string;
}

export type EditableRole = 'admin' | 'staff' | 'doctor';

export interface MonthlyBonus {
  id: string;
  period: string; // "YYYY-MM"
  description: string;
  type: 'flat' | 'percentage-ctc';
  value: number;
}

export interface NewMonthlyBonusData extends Omit<MonthlyBonus, 'id'> {}


export interface Hospital {
  id: string;
  name: string;
  slug: string;
  address: Address;
  phone: string;
  email?: string;
  logoUrl: string;
  ownerId: string;
  createdAt: Timestamp;
  status: 'active' | 'inactive';
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  subscriptionExpiryDate: Timestamp;
  subscriptionPackageId?: string;
  subscriptionInterval?: 'monthly' | 'quarterly' | 'yearly';
  lastPatientNumber?: number;
  lastInvoiceNumber?: number;
  lastStockOrderNumber?: number;
  lastStockReturnNumber?: number;
  lastExpenseNumber?: number;
  lastPOSSaleNumber?: number;
  lastVendorNumber?: number;
  lastEmployeeNumber?: number;
  lastLoanNumber?: number;
  lastStockTransferNumber?: number;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  financialYearStartMonth?: string;
  stockCategories?: string[];
  stockUnitTypes?: string[];
  stockBrands?: string[];
  expenseCategories?: string[];
  notificationSettings?: NotificationSettings;
  invoiceSettings?: InvoiceSettingsData;
  emailSettings?: EmailSettings;
  rolePermissions?: Record<EditableRole, Permissions>;
  gstin?: string;
  dlNo?: string;
  cinNo?: string;
  fssaiNo?: string;
  website?: string;
  telephone?: string;
  monthlyBonuses?: MonthlyBonus[];
  employeeLocations?: string[];
  employeeDepartments?: string[];
  employeeDesignations?: string[];
  employeeShifts?: string[];
}

// This represents the user object available in the AuthContext
export interface AppUser {
  // FIX: Add 'id' property to AppUser interface to fix type error.
  id: string;
  uid: string;
  email: string | null;
  name: string;
  phone: string;
  address: Address;
  profilePhotoUrl: string;
  roleName: 'owner' | 'admin' | 'staff' | 'doctor' | 'patient';
  isSuperAdmin?: boolean;
  hospitalId?: string;
  hospitalSlug?: string;
  hospitalName?: string;
  hospitalAddress?: Address;
  hospitalPhone?: string;
  hospitalEmail?: string;
  hospitalLogoUrl?: string;
  permissions?: Permissions;
  doctorId?: string;
  patientId?: string;
  // FIX: Add patient-specific properties to support patient portal features.
  registeredAt?: Timestamp;
  documents?: PatientDocumentFile[];
  notes?: PatientNote[];
  hospitalCurrency?: string;
  hospitalTimezone?: string;
  hospitalDateFormat?: string;
  hospitalTimeFormat?: string;
  hospitalFinancialYearStartMonth?: string;
  hospitalStockCategories?: string[];
  hospitalStockUnitTypes?: string[];
  hospitalStockBrands?: string[];
  hospitalExpenseCategories?: string[];
  hospitalStatus?: 'active' | 'inactive';
  hospitalCreatedAt?: Timestamp;
  hospitalSubscriptionExpiryDate?: Timestamp;
  subscriptionPackageId?: string;
  subscriptionPackage?: SubscriptionPackage;
  hospitalSubscriptionInterval?: 'monthly' | 'quarterly' | 'yearly';
  hospitalNotificationSettings?: NotificationSettings;
  hospitalInvoiceSettings?: InvoiceSettingsData;
  hospitalEmailSettings?: EmailSettings;
  hospitalRolePermissions?: Record<EditableRole, Permissions>;
  hospitalGstin?: string;
  hospitalDlNo?: string;
  hospitalCinNo?: string;
  hospitalFssaiNo?: string;
  hospitalWebsite?: string;
  hospitalTelephone?: string;
  hospitalMonthlyBonuses?: MonthlyBonus[];
  hospitalEmployeeLocations?: string[];
  hospitalEmployeeDepartments?: string[];
  hospitalEmployeeDesignations?: string[];
  hospitalEmployeeShifts?: string[];
  // Multi-location support
  assignedLocations?: string[];
  currentLocation?: HospitalLocation | null;
  hospitalLocations?: HospitalLocation[];
}

// This represents the user document stored in Firestore
export interface UserDocument {
  id?: string; // Document ID
  uid?: string; // UID is absent for an invited user
  email: string;
  name: string;
  phone: string;
  address: Address;
  profilePhotoUrl: string;
  roleName: 'owner' | 'admin' | 'staff' | 'doctor';
  hospitalId: string;
  hospitalSlug: string;
  status: 'active' | 'invited' | 'inactive';
  isSuperAdmin?: boolean;
  doctorId?: string;
  // FIX: Added assignedLocations to UserDocument to fix type error in AuthContext.
  assignedLocations: string[]; // Location IDs
}

export interface PatientMedicalInfo {
  height?: number; // in cm
  weight?: number; // in kg
  bloodGroup?: string;
  bloodPressure?: string; // e.g., '120/80'
  bloodSugar?: string;
  hemoglobin?: string;
  heartRate?: string;
}

export interface PatientNote {
  id: string;
  text: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface PatientDocumentFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
}


export interface PatientDocument {
  id: string;
  uid?: string;
  patientId: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  phone: string;
  email?: string;
  emergencyContact: string;
  address: string;
  primaryDiagnosis: string;
  allergies: string[];
  medicalHistory: string;
  profilePhotoUrl: string;
  registeredAt: Timestamp;
  hospitalId: string;
  locationId: string; // Branch where patient registered
  status: 'active' | 'inactive';
  medicalInfo?: PatientMedicalInfo;
  notes?: PatientNote[];
  documents?: PatientDocumentFile[];
}


export interface NewPatientData {
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  phone: string;
  email?: string;
  emergencyContact: string;
  address: string;
  primaryDiagnosis: string;
  allergies: string[];
  medicalHistory: string;
  profilePhoto?: File | string;
}

export interface PatientUpdateData {
    name: string;
    gender: 'Male' | 'Female' | 'Other';
    dateOfBirth: string;
    phone: string;
    email?: string;
    emergencyContact: string;
    address: string;
    primaryDiagnosis: string;
    allergies: string[];
    medicalHistory: string;
    medicalInfo?: PatientMedicalInfo;
    profilePhoto?: File | string | null;
}

export type AppointmentStatus = 'Registered' | 'Finished' | 'Encounter' | 'Waiting Payment' | 'Cancelled' | 'No Show';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  start: Timestamp;
  end: Timestamp;
  treatmentName: string;
  status: AppointmentStatus;
  hospitalId: string;
  // FIX: Added missing locationId property to Appointment type.
  locationId: string;
}

export interface NewAppointmentData {
    patientId: string;
    doctorId: string;
    start: Date;
    end: Date;
    treatmentName: string; // From Treatment document `name`
    status: AppointmentStatus;
}


export interface SignUpData {
  hospitalName: string;
  hospitalPhone: string;
  hospitalEmail?: string;
  hospitalAddress: Address;
  hospitalLogo?: File;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAddress: Address;
  userPassword?: string;
  userProfilePhoto?: File;
}

export interface NewStaffData {
  name: string;
  email: string;
  phone: string;
  address: Address;
  password?: string;
  assignedLocations: string[];
  roleName: 'staff' | 'admin';
}

export interface UserUpdateData {
    name: string;
    phone: string;
    address: Address;
    profilePhoto?: File | string | null;
    roleName?: 'staff' | 'admin';
    assignedLocations?: string[];
}

export interface Treatment {
  id?: string;
  name: string;
  description: string;
  duration: number; // in minutes
  cost: number;
  hospitalId: string;
  photoUrl?: string;
  taxGroupId?: string;
}

export interface NewTreatmentData {
    name: string;
    description: string;
    duration: number;
    cost: number;
    photo?: File | string;
    taxGroupId?: string;
}

export interface TreatmentUpdateData {
    name: string;
    description: string;
    duration: number;
    cost: number;
    photo?: File | string | null;
    taxGroupId?: string;
}

// FIX: Add missing Medicine types for MedicinesScreen.tsx
export interface Medicine {
  id?: string;
  name: string;
  genericName: string;
  strength: string;
  form: 'Tablet' | 'Syrup' | 'Capsule' | 'Injection' | 'Ointment' | 'Other';
  hospitalId: string;
}

export interface NewMedicineData {
  name: string;
  genericName: string;
  strength: string;
  form: 'Tablet' | 'Syrup' | 'Capsule' | 'Injection' | 'Ointment' | 'Other';
}

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface WorkingHour {
  start: string; // e.g., "09:00"
  end: string;   // e.g., "17:00"
}

export type WorkingHours = {
  [key in DayOfWeek]?: WorkingHour;
};

export interface DoctorDocument {
  id?: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  profilePhotoUrl: string;
  workingDays: DayOfWeek[];
  workingHours: WorkingHours;
  slotInterval: number; // in minutes
  assignedTreatments: string[]; // Stores treatment IDs
  employmentType: 'Full-time' | 'Part-time';
  hospitalId: string;
  status: 'active' | 'inactive';
  assignedLocations: string[];
}

export interface NewDoctorData {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  address: Address;
  profilePhoto?: File | string;
  workingDays: DayOfWeek[];
  workingHours: WorkingHours;
  slotInterval: number;
  assignedTreatments: string[];
  employmentType: 'Full-time' | 'Part-time';
  assignedLocations: string[];
}

export interface DoctorUpdateData {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  profilePhoto?: File | string | null;
  workingDays: DayOfWeek[];
  workingHours: WorkingHours;
  slotInterval: number;
  assignedTreatments: string[];
  employmentType: 'Full-time' | 'Part-time';
  assignedLocations: string[];
}

export interface PrescribedMedicine {
    stockItemId: string;
    name: string;
    sku: string;
    unitType: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
}

export interface Consultation {
    id?: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    // FIX: Add optional doctorName to support display in patient portal
    doctorName?: string;
    hospitalId: string;
    locationId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    investigation?: string;
    diagnosis?: string;
    prescribedMedicines: PrescribedMedicine[];
    labTests: string[];
    allergies?: string;
    advice?: string;
    nextVisitDate?: Timestamp;
}

export interface ConsultationUpdateData {
    investigation?: string;
    diagnosis?: string;
    prescribedMedicines: PrescribedMedicine[];
    labTests: string[];
    allergies?: string;
    advice?: string;
    nextVisitDate?: Date;
}

export type InvoiceStatus = 'Unpaid' | 'Partially Paid' | 'Paid';

export interface InvoiceItem {
  description: string;
  cost: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  date: Timestamp;
  note?: string;
  recordedBy?: string;
}

export interface InvoiceTaxComponent {
  name: string;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string; // Firestore document ID
  invoiceId: string; // Human-readable e.g. INV-00123
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  // FIX: Added missing locationId property to Invoice type.
  locationId: string;
  createdAt: Timestamp;
  appointmentDate: Timestamp;
  items: InvoiceItem[];
  subtotal: number;
  taxes: InvoiceTaxComponent[];
  totalTax: number;
  totalAmount: number;
  status: InvoiceStatus;
  amountPaid: number;
  paymentHistory: Payment[];
}

export interface ExpenseComment {
  id: string;
  text: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
  userName: string;
  userProfilePhotoUrl?: string;
}

export interface Expense {
  id: string; // Firestore document ID
  expenseId: string; // Human-readable e.g. EXP-00123
  date: Timestamp;
  category: string;
  subtotal: number;
  taxGroupId?: string;
  taxes: InvoiceTaxComponent[];
  totalTax: number;
  discountPercentage: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: InvoiceStatus;
  amountPaid: number;
  paymentHistory: Payment[];
  note?: string;
  documentUrl?: string;
  documentName?: string;
  hospitalId: string;
  // FIX: Added missing locationId property to Expense type.
  locationId: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  paymentTerms?: number; // in days
  comments?: ExpenseComment[];
}

export interface NewExpenseData {
  date: Date;
  category: string;
  subtotal: number;
  taxGroupId?: string;
  discountPercentage?: number;
  note?: string;
  document?: File | null;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  paymentTerms?: number;
}

export interface ExpenseUpdateData {
  date: Date;
  category: string;
  subtotal: number;
  taxGroupId?: string | null;
  discountPercentage?: number;
  note?: string;
  document?: File | null;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  paymentTerms?: number;
}

export interface HospitalUpdateData {
    name: string;
    phone: string;
    email?: string;
    address: Address;
    logo?: File | null;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    financialYearStartMonth: string;
    gstin?: string;
    dlNo?: string;
    cinNo?: string;
    fssaiNo?: string;
    website?: string;
    telephone?: string;
}

export interface Tax {
  id?: string;
  name: string;
  rate: number; // percentage
  hospitalId: string;
}

export interface NewTaxData {
  name: string;
  rate: number;
}

export interface TaxGroup {
  id?: string;
  name: string;
  taxIds: string[];
  totalRate: number;
  hospitalId: string;
}

export interface NewTaxGroupData {
  name: string;
  taxIds: string[];
}

export interface StockBatch {
  id: string;
  batchNumber: string;
  expiryDate?: Timestamp;
  quantity: number;
  costPrice: number;
  salePrice: number;
}

export interface StockLocationInfo {
  totalStock: number;
  lowStockThreshold: number;
  batches: StockBatch[];
}

export interface StockItem {
  id?: string;
  name: string;
  category: string;
  sku: string;
  vendor: string;
  hospitalId: string;
  unitType: string;
  description: string;
  photoUrl?: string;
  taxId?: string;
  hsnCode?: string;
  locationStock: {
    [locationId: string]: StockLocationInfo;
  };
  // FIX: Added client-side flattened properties for current location to resolve type errors.
  totalStock: number;
  lowStockThreshold: number;
  batches: StockBatch[];
}

export interface InitialBatchDetails {
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
}

export interface NewStockItemData {
  name: string;
  category: string;
  sku: string;
  vendor: string;
  unitType: string;
  description: string;
  photo?: File | string | null;
  taxId?: string;
  hsnCode?: string;
  initialLocationStock: {
    [locationId: string]: {
      lowStockThreshold: number;
      initialBatch?: InitialBatchDetails;
    };
  };
}

export interface StockItemUpdateData {
    name: string;
    category: string;
    sku: string;
    vendor: string;
    unitType: string;
    description: string;
    photo?: File | string | null;
    taxId?: string;
    hsnCode?: string;
    // FIX: Add properties for updating current location's stock info.
    lowStockThreshold?: number;
    batches?: StockBatch[];
}


export type StockOrderStatus = 'Pending' | 'Partially Received' | 'Complete' | 'Cancelled';

export interface StockOrderItem {
  stockItemId: string;
  name: string;
  sku: string;
  category: string;
  unitType: string;
  costPrice: number; // Tax-inclusive purchase price at time of order
  orderedQty: number;
  receivedQty: number;
  returnedQty: number;
}

export interface StockAttachment {
    name: string;
    url: string;
}

export interface StockOrderComment {
  id: string;
  text: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
  userName: string;
  userProfilePhotoUrl?: string;
}

export interface StockOrder {
  id?: string;
  orderId: string;
  vendor: string;
  createdAt: Timestamp;
  orderDate: Timestamp;
  paymentTerms: number; // in days
  attachments: StockAttachment[];
  totalValue: number;
  status: StockOrderStatus;
  items: StockOrderItem[];
  totalItems: number;
  totalReceivedItems: number;
  hospitalId: string;
  // FIX: Added missing locationId property to StockOrder type.
  locationId: string;
  comments?: StockOrderComment[];
  paymentStatus: InvoiceStatus;
  amountPaid: number;
  paymentHistory: Payment[];
  createdBy?: string;
}

export interface NewStockOrderData {
    vendor: string;
    items: { stockItemId: string; orderedQty: number; costPrice: number }[];
    orderDate: Date;
    paymentTerms: number; // in days
    attachments: File[];
}

export interface StockMovement {
  id?: string;
  date: Timestamp;
  type: 'initial' | 'received' | 'sale' | 'adjustment' | 'return' | 'transfer-out' | 'transfer-in' | 'transfer-reversal';
  quantityChange: number; // positive for additions, negative for subtractions
  cost?: number; // The actual cost of items for 'received' type
  notes?: string;
  relatedOrderId?: string;
  relatedInvoiceId?: string;
  relatedReturnId?: string;
  relatedTransferId?: string;
  // FIX: Add batchNumber to track which batch was affected by the movement.
  batchNumber?: string;
  locationId?: string;
}

export interface StockReturnItem {
  stockItemId: string;
  name: string;
  sku: string;
  returnedQty: number;
  costPriceAtReturn: number;
  batchId: string;
  batchNumber: string;
}

export interface StockReturn {
  id?: string;
  returnId: string; // e.g., RET-0001
  vendor: string;
  createdAt: Timestamp;
  returnDate: Timestamp;
  relatedOrderId: string;
  items: StockReturnItem[];
  totalReturnValue: number;
  notes?: string;
  hospitalId: string;
  // FIX: Added missing locationId property to StockReturn type.
  locationId: string;
  createdBy?: string;
}

export interface NewStockReturnData {
    vendor: string;
    relatedOrderId: string;
    returnDate: Date;
    items: { stockItemId: string; batchId: string; returnedQty: number; }[];
    notes?: string;
}

export type StockTransferStatus = 'Completed' | 'Reversed';

export interface StockTransferItem {
    stockItemId: string;
    name: string;
    sku: string;
    unitType: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    costPriceAtTransfer: number;
}

export interface StockTransfer {
    id: string;
    transferId: string; // e.g., TRN-0001
    fromLocationId: string;
    fromLocationName: string;
    toLocationId: string;
    toLocationName: string;
    transferDate: Timestamp;
    items: StockTransferItem[];
    totalValue: number;
    status: StockTransferStatus;
    notes?: string;
    hospitalId: string;
    createdBy: string;
    createdAt: Timestamp;
}

export interface NewStockTransferData {
    toLocationId: string;
    transferDate: Date;
    items: {
        stockItemId: string;
        batchId: string;
        quantity: number;
    }[];
    notes?: string;
}

export interface POSSaleItem {
    stockItemId: string;
    batchId: string;
    batchNumber: string;
    name: string;
    sku: string;
    quantity: number;
    unitType: string;
    salePrice: number; // pre-tax price per unit at time of sale
    discountAmount?: number; // total discount for this line item, applied on the tax-inclusive price
    taxRate: number; // tax rate at time of sale
    taxAmount: number; // tax amount per unit, calculated on original pre-discount price
    expiryDate?: string;
    hsnCode?: string;
    taxName?: string;
}

export type POSSaleStatus = 'Completed' | 'Cancelled' | 'Draft';
export type POSSalePaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';
export type POSPaymentMethod = 'Cash' | 'Card' | 'Gpay' | 'Phonepe' | 'Paytm' | 'Other';

export interface POSSale {
    id: string; // Firestore document ID
    saleId: string; // Human-readable e.g. POS-00001
    patientId?: string; // Optional patient link
    patientName: string; // "Walk-in Customer" or patient's name
    createdAt: Timestamp;
    items: POSSaleItem[];
    grossTotal: number; // Pre-tax, pre-discount total of all items
    totalItemDiscount: number; // Sum of all item-level discounts (post-tax value)
    subtotal: number; // Pre-tax, pre-discount total. For compatibility, this is same as grossTotal.
    taxAmount: number; // Total tax based on pre-discount grossTotal
    overallDiscount: number; // Bill-level discount (post-tax value)
    totalAmount: number; // Grand total: (grossTotal + taxAmount) - totalItemDiscount - overallDiscount
    amountPaid: number;
    paymentMethod: POSPaymentMethod;
    status: POSSaleStatus;
    paymentStatus: POSSalePaymentStatus;
    hospitalId: string;
    // FIX: Added missing locationId property to POSSale type.
    locationId: string;
    createdBy: string; // name of user who made the sale
    paymentHistory: Payment[];
}

export interface NewPOSSaleData {
    patientId?: string;
    patientName: string;
    items: POSSaleItem[];
    grossTotal: number; // Pre-tax, pre-discount total of all items
    totalItemDiscount: number; // Sum of all item-level discounts (post-tax value)
    subtotal: number; // Pre-tax, pre-discount total. For compatibility, this is same as grossTotal.
    taxAmount: number; // Total tax based on pre-discount grossTotal
    overallDiscount: number; // Bill-level discount (post-tax value)
    totalAmount: number; // Grand total: (grossTotal + taxAmount) - totalItemDiscount - overallDiscount
    amountPaid: number;
    paymentMethod: POSPaymentMethod;
    status: POSSaleStatus;
    paymentStatus?: POSSalePaymentStatus;
}

export interface SubscriptionTransaction {
  id: string;
  hospitalId: string;
  paymentId: string; // From Razorpay
  orderId?: string; // From Razorpay
  signature?: string; // From Razorpay
  packageId: string;
  packageName: string;
  amount: number;
  currency: 'INR';
  status: 'success' | 'failed';
  createdAt: Timestamp;
  interval: 'monthly' | 'quarterly' | 'yearly';
}

export interface NewSubscriptionTransactionData {
  paymentId: string;
  orderId?: string;
  signature?: string;
  packageId: string;
  packageName: string;
  amount: number;
  currency: 'INR';
  status: 'success' | 'failed';
  interval: 'monthly' | 'quarterly' | 'yearly';
}

export interface PeripheralAttachment {
  id: string;
  name: string;
  url: string;
  uploadedAt: Timestamp;
}

export type PeripheralStatus = 'In Use' | 'In Storage' | 'In Repair' | 'Decommissioned';

export interface Peripheral {
  id?: string;
  hospitalId: string;
  // FIX: Added missing locationId property to Peripheral type.
  locationId: string;
  
  name: string;
  photoUrl?: string;
  assignedTo: string;
  status: PeripheralStatus;
  tags: string[];

  // Product Details
  series?: string;
  category: string;
  weight?: number;
  weightUnit?: 'lb' | 'kg';
  sku: string;
  barcode?: string;
  description?: string;

  // Purchase Details
  purchaseDate: Timestamp;
  purchasePrice: number;
  vendor: string;
  invoiceNumber?: string;
  
  attachments: PeripheralAttachment[];
}

export interface NewPeripheralData {
  name: string;
  photo?: File | string | null;
  assignedTo: string;
  status: PeripheralStatus;
  tags: string[];
  series?: string;
  category: string;
  weight?: number;
  weightUnit?: 'lb' | 'kg';
  sku: string;
  barcode?: string;
  description?: string;
  purchaseDate: Date;
  purchasePrice: number;
  vendor: string;
  invoiceNumber?: string;
  newAttachments: File[];
  locationId: string;
}

export interface PeripheralUpdateData extends Partial<Omit<NewPeripheralData, 'newAttachments' | 'purchaseDate'>> {
  purchaseDate?: Date;
  removedAttachmentIds?: string[];
  newAttachments?: File[];
}

export interface VendorContactPerson {
    id: string; // for React keys, can be cuid or timestamp
    name: string;
    email?: string;
    mobile: string;
    designation?: string;
}

export interface Vendor {
    id: string;
    vendorId: string; // VDR-0001
    name: string;
    email: string;
    phone: string;
    taxNumber?: string;
    address: Address;
    contactPersons: VendorContactPerson[];
    hospitalId: string;
    status: 'active' | 'inactive';
}

export interface NewVendorData {
    name: string;
    email: string;
    phone: string;
    taxNumber?: string;
    address: Address;
    contactPersons: Omit<VendorContactPerson, 'id'>[];
}

export interface VendorUpdateData extends Partial<Omit<NewVendorData, 'contactPersons'>> {
    contactPersons?: VendorContactPerson[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  hospitalId: string;
  locationId?: string;
  timestamp: Timestamp;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface PayslipItem {
    id: string;
    name: string;
    amount: number;
}
export type PayslipStatus = 'Unpaid' | 'Paid';
export interface Payslip {
    id: string;
    employeeId: string; // links to Employee document
    userName: string;
    userRole: 'staff' | 'admin' | 'owner' | 'doctor';
    annualCTC: number;
    monthlyCTC: number;
    earnings: PayslipItem[];
    additionalEarnings: PayslipItem[];
    deductions: PayslipItem[];
    additionalDeductions: PayslipItem[];
    grossSalary: number; // sum of earnings
    totalDeductions: number; // sum of deductions
    netPay: number;
    status: PayslipStatus;
    paymentDate?: Timestamp;
}

export type PayrollRunStatus = 'draft' | 'finalized';
export interface PayrollRun {
    id: string;
    period: string; // "YYYY-MM"
    runDate: Timestamp;
    totalAmount: number;
    status: PayrollRunStatus;
    payslips: Payslip[];
    hospitalId: string;
  // FIX: Added missing locationId property to PayrollRun type.
  locationId: string;
}

export type ProofType = 'drivingLicense' | 'pan' | 'aadhar' | 'voterId';

export interface EmployeeDocument {
    id: string;
    name: string;
    url: string;
    type: ProofType;
}

export interface BankDetails {
    accountHolderName: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
}

export interface Proofs {
    drivingLicenseNumber: string;
    panNumber: string;
    aadharNumber: string;
    voterIdNumber: string;
}

export interface SalaryHistoryEntry {
  effectiveDate: Timestamp;
  annualCTC: number;
  salaryGroupId: string;
  revisedBy: string; // User's name
}

export interface Employee {
  id?: string;
  hospitalId: string;
  // FIX: Added missing locationId property to Employee type.
  locationId: string;
  userId?: string; // Link to users collection for login
  doctorId?: string; // Link to doctors collection if applicable
  
  // Basic Details
  profilePhotoUrl?: string;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  joiningDate: Timestamp;
  status: 'active' | 'inactive';
  address: Address;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;

  // Work Information
  location?: string;
  shift?: string;
  department?: string;
  designation?: string;
  reportingTo?: string; // User ID of manager

  // Salary Details
  salaryGroupId?: string;
  annualCTC: number;
  salaryHistory?: SalaryHistoryEntry[];
  
  // Bank, Proofs, and Documents
  bankDetails?: Partial<BankDetails>;
  proofs?: Partial<Proofs>;
  documents?: EmployeeDocument[];
}

export interface NewEmployeeData extends Omit<Employee, 'id' | 'hospitalId' | 'employeeId' | 'joiningDate' | 'documents' | 'salaryHistory' | 'locationId'> {
    profilePhoto?: File | string | null;
    joiningDate: string;
    newDocuments?: { file: File, type: ProofType }[];
    removedDocumentIds?: string[];
}


export interface SalaryComponent {
    id?: string;
    hospitalId: string;
    name: string; // e.g., Basic, HRA, Professional Tax
    type: 'earning' | 'deduction';
    // value is percentage. 'basic' is percentage of Basic Pay component.
    calculationType: 'flat' | 'percentage-ctc' | 'percentage-basic';
    value: number; // The flat amount or percentage value
}

export interface NewSalaryComponentData extends Omit<SalaryComponent, 'id' | 'hospitalId'> {}

export interface SalaryGroup {
    id?: string;
    hospitalId: string;
    name: string; // e.g., "Senior Doctors Grade I"
    description?: string;
    components: string[]; // Array of SalaryComponent IDs
}

export interface NewSalaryGroupData extends Omit<SalaryGroup, 'id' | 'hospitalId'> {}

export type LoanStatus = 'active' | 'paused' | 'closed' | 'pending';

export interface LoanRepayment {
    id: string; // payslip.id or a unique ID
    period: string; // "YYYY-MM"
    amount: number;
    paidDate: Timestamp;
}

export interface Loan {
  id?: string;
  hospitalId: string;
  // FIX: Added missing locationId property to Loan type.
  locationId: string;
  employeeId: string;
  employeeName: string; // for display
  loanId: string; // L-0001
  loanType: string;
  loanAmount: number;
  disbursementDate: Timestamp;
  reason: string;
  repaymentStartDate: Timestamp;
  installmentAmount: number;
  installmentPeriod: number; // in months
  status: LoanStatus;
  amountPaid: number;
  repaymentHistory: LoanRepayment[];
  createdBy: string;
  createdAt: Timestamp;
}

export interface NewLoanData extends Omit<Loan, 'id' | 'hospitalId' | 'loanId' | 'employeeName' | 'status' | 'amountPaid' | 'repaymentHistory' | 'createdBy' | 'createdAt' | 'disbursementDate' | 'repaymentStartDate' | 'locationId'> {
    disbursementDate: string;
    repaymentStartDate: string;
}

export interface HospitalLocation {
    id: string;
    status: 'active' | 'inactive';
}

export interface NewHospitalLocationData {
    name: string;
    address: Address;
    phone: string;
    email?: string;
    status?: 'active' | 'inactive';
}

export interface UpdateHospitalLocationData extends Partial<NewHospitalLocationData> {}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  // Location Management
  hospitalLocations: HospitalLocation[];
  currentLocation: HospitalLocation | null;
  setCurrentLocation: (locationId: string) => void;
  // Real-time Data State (Hospital User)
  patients: PatientDocument[];
  doctors: DoctorDocument[];
  treatments: Treatment[];
  medicines: Medicine[];
  consultations: Consultation[];
  usersForHospital: UserDocument[];
  stockItems: StockItem[];
  stockOrders: StockOrder[];
  stockReturns: StockReturn[];
  stockTransfers: StockTransfer[];
  vendors: Vendor[];
  peripherals: Peripheral[];
  employees: Employee[];
  loans: Loan[];
  taxes: Tax[];
  taxGroups: TaxGroup[];
  salaryComponents: SalaryComponent[];
  salaryGroups: SalaryGroup[];
  // Real-time Data State (Patient User)
  myAppointments: Appointment[];
  myConsultations: Consultation[];
  myInvoices: Invoice[];
  myPOSSales: POSSale[];
  // Real-time Data State (Super Admin)
  allHospitals: Hospital[];
  allSubscriptionPackages: SubscriptionPackage[];
  allSubscriptionTransactions: SubscriptionTransaction[];

  login: (email: string, pass: string) => Promise<void>;
  signup: (isInvited: boolean, isPatient: boolean, data: SignUpData, patientIdToLink?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  // Super Admin
  getAllHospitals: () => Promise<Hospital[]>;
  getHospitalById: (hospitalId: string) => Promise<Hospital | null>;
  getUsersForHospitalBySuperAdmin: (hospitalId: string) => Promise<UserDocument[]>;
  updateHospitalStatusBySuperAdmin: (hospitalId: string, status: 'active' | 'inactive') => Promise<void>;
  updateHospitalSubscriptionBySuperAdmin: (hospitalId: string, newExpiryDate: Date) => Promise<void>;
  getSubscriptionTransactionsForHospital: (hospitalId: string) => Promise<SubscriptionTransaction[]>;
  getAllSubscriptionTransactions: () => Promise<SubscriptionTransaction[]>;
  addSubscriptionPackage: (data: NewSubscriptionPackageData) => Promise<void>;
  updateSubscriptionPackage: (packageId: string, data: NewSubscriptionPackageData) => Promise<void>;
  deleteSubscriptionPackage: (packageId: string) => Promise<void>;
  assignSubscriptionPackageToHospital: (hospitalId: string, packageId: string) => Promise<void>;
  getAuditLogsForHospital: (hospitalId: string) => Promise<AuditLog[]>;
  // Subscription management for hospital admins
  getSubscriptionPackages: () => Promise<SubscriptionPackage[]>;
  changeSubscriptionPackage: (packageId: string, interval: 'monthly' | 'quarterly' | 'yearly') => Promise<void>;
  recordSubscriptionPayment: (data: NewSubscriptionTransactionData) => Promise<void>;
  getSubscriptionTransactions: () => Promise<SubscriptionTransaction[]>;
  switchToFreePlan: () => Promise<void>;
  initiatePaymentForPackage: (packageToPurchase: SubscriptionPackage, interval: 'monthly' | 'quarterly' | 'yearly') => Promise<void>;
  // User Management
  addUser: (data: NewStaffData) => Promise<void>;
  getUserById: (userId: string) => Promise<UserDocument | null>;
  updateUser: (userId: string, data: UserUpdateData) => Promise<void>;
  updateUserStatus: (userId: string, status: 'active' | 'inactive') => Promise<void>;
  changeUserRole: (userId: string, role: 'admin' | 'staff') => Promise<void>;
  resetUserPasswordByAdmin: (userId: string, newPassword: string) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  // Treatment Management
  // FIX: Added 'getTreatments' to the AuthContextType interface to resolve type errors in components that use it.
  getTreatments: () => Promise<Treatment[]>;
  getTreatmentById: (treatmentId: string) => Promise<Treatment | null>;
  addTreatment: (data: NewTreatmentData) => Promise<void>;
  updateTreatment: (treatmentId: string, data: TreatmentUpdateData) => Promise<void>;
  deleteTreatment: (treatmentId: string) => Promise<void>;
  // Medicine Management
  getMedicines: () => Promise<Medicine[]>;
  addMedicine: (data: NewMedicineData) => Promise<void>;
  updateMedicine: (medicineId: string, data: NewMedicineData) => Promise<void>;
  deleteMedicine: (medicineId: string) => Promise<void>;
  // Patient Management
  getPatients: () => Promise<PatientDocument[]>;
  addPatient: (data: NewPatientData) => Promise<void>;
  getPatientById: (patientId: string) => Promise<PatientDocument | null>;
  updatePatient: (patientId: string, data: PatientUpdateData) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  updatePatientStatus: (patientId: string, status: 'active' | 'inactive') => Promise<void>;
  addPatientNote: (patientId: string, noteText: string) => Promise<void>;
  deletePatientNote: (patientId: string, noteId: string) => Promise<void>;
  uploadPatientDocument: (patientId: string, file: File) => Promise<void>;
  deletePatientDocument: (patientId: string, documentFile: PatientDocumentFile) => Promise<void>;
  // Doctor Management
  getDoctors: () => Promise<DoctorDocument[]>;
  addDoctor: (data: NewDoctorData) => Promise<void>;
  getDoctorById: (doctorId: string) => Promise<DoctorDocument | null>;
  updateDoctor: (doctorId: string, data: DoctorUpdateData) => Promise<void>;
  deleteDoctor: (doctorId: string) => Promise<void>;
  updateDoctorStatus: (doctorId: string, status: 'active' | 'inactive') => Promise<void>;
  // Appointment Management (Transactional - not live state)
  addAppointment: (data: NewAppointmentData) => Promise<void>;
  getAppointments: (startDate: Date, endDate: Date) => Promise<Appointment[]>;
  getAppointmentsForPatient: (patientId: string) => Promise<Appointment[]>;
  updateAppointment: (appointmentId: string, data: Partial<NewAppointmentData>) => Promise<void>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  // Consultation Management
  getConsultationForAppointment: (appointmentId: string) => Promise<Consultation | null>;
  getConsultationsForPatient: (patientId: string) => Promise<Consultation[]>;
  saveConsultation: (appointment: Appointment, data: ConsultationUpdateData) => Promise<void>;
  // Invoice Management (Transactional - not live state)
  addInvoice: (appointment: Appointment, treatment: Treatment) => Promise<void>;
  getInvoices: (startDate?: Date, endDate?: Date) => Promise<Invoice[]>;
  updateInvoicePayment: (invoiceId: string, payment: Omit<Payment, 'date' | 'id' | 'recordedBy'>) => Promise<void>;
  updateInvoicePaymentDetails: (invoiceId: string, payment: Payment) => Promise<void>;
  deleteInvoicePayment: (invoiceId: string, paymentId: string) => Promise<void>;
  // Expense Management (Transactional - not live state)
  getExpenses: (locationId?: string, startDate?: Date, endDate?: Date, limitVal?: number, lastVisible?: firebase.firestore.QueryDocumentSnapshot | null) => Promise<{ expenses: Expense[]; lastVisible: firebase.firestore.QueryDocumentSnapshot | null; }>;
  addExpense: (data: NewExpenseData) => Promise<void>;
  getExpenseById: (expenseId: string) => Promise<Expense | null>;
  updateExpensePayment: (expenseId: string, payment: Omit<Payment, 'date' | 'id' | 'recordedBy'>) => Promise<void>;
  updateExpensePaymentDetails: (expenseId: string, payment: Payment) => Promise<void>;
  deleteExpensePayment: (expenseId: string, paymentId: string) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  updateExpense: (expenseId: string, data: ExpenseUpdateData) => Promise<void>;
  addExpenseComment: (expenseId: string, text: string) => Promise<void>;
  updateExpenseComment: (expenseId: string, comment: ExpenseComment) => Promise<void>;
  deleteExpenseComment: (expenseId: string, commentId: string) => Promise<void>;
  // Hospital Management
  updateHospitalSettings: (settings: HospitalUpdateData) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  updateInvoiceSettings: (settings: Partial<InvoiceSettingsData>) => Promise<void>;
  updateEmailSettings: (settings: EmailSettings) => Promise<void>;
  updateRolePermissions: (roleName: EditableRole, permissions: Permissions) => Promise<void>;
  addHospitalLocation: (data: NewHospitalLocationData) => Promise<void>;
  updateHospitalLocation: (locationId: string, data: UpdateHospitalLocationData) => Promise<void>;
  deleteHospitalLocation: (locationId: string) => Promise<void>;
  // Tax Management
  getTaxes: () => Promise<Tax[]>;
  addTax: (data: NewTaxData) => Promise<void>;
  updateTax: (taxId: string, data: NewTaxData) => Promise<void>;
  deleteTax: (taxId: string) => Promise<void>;
  // Tax Group Management
  getTaxGroups: () => Promise<TaxGroup[]>;
  addTaxGroup: (data: NewTaxGroupData) => Promise<void>;
  updateTaxGroup: (taxGroupId: string, data: NewTaxGroupData) => Promise<void>;
  deleteTaxGroup: (taxGroupId: string) => Promise<void>;
  // Stock Management
  getStocks: () => Promise<StockItem[]>;
  getStockItemById: (stockId: string) => Promise<StockItem | null>;
  addStock: (data: NewStockItemData) => Promise<void>;
  updateStock: (stockId: string, data: any) => Promise<void>;
  deleteStock: (stockId: string) => Promise<void>;
  getStockMovements: (stockId: string) => Promise<StockMovement[]>;
  adjustStockQuantity: (stockId: string, locationId: string, batchId: string, quantityChange: number, reason: string) => Promise<void>;
  addStockTransfer: (data: NewStockTransferData) => Promise<void>;
  getStockTransfers: (startDate?: Date, endDate?: Date) => Promise<StockTransfer[]>;
  getStockTransferById: (transferId: string) => Promise<StockTransfer | null>;
  deleteStockTransfer: (transferId: string) => Promise<void>;
  // Stock Order Management
  getStockOrders: (startDate?: Date, endDate?: Date) => Promise<StockOrder[]>;
  getStockOrderById: (orderId: string) => Promise<StockOrder | null>;
  addStockOrder: (data: NewStockOrderData) => Promise<void>;
  receiveStockOrderItems: (orderId: string, receivedItems: { stockItemId: string; batches: { receivedNowQty: number; costPrice: number; batchNumber?: string; expiryDate?: string; }[] }[]) => Promise<void>;
  cancelStockOrder: (orderId: string) => Promise<void>;
  deleteStockOrder: (orderId: string) => Promise<void>;
  addStockOrderComment: (orderId: string, text: string) => Promise<void>;
  updateStockOrderComment: (orderId: string, comment: StockOrderComment) => Promise<void>;
  deleteStockOrderComment: (orderId: string, commentId: string) => Promise<void>;
  updateStockOrderPayment: (orderId: string, payment: Omit<Payment, 'date' | 'id' | 'recordedBy'>) => Promise<void>;
  updateStockOrderPaymentDetails: (orderId: string, payment: Payment) => Promise<void>;
  deleteStockOrderPayment: (orderId: string, paymentId: string) => Promise<void>;
  // Stock Return Management
  getStockReturns: (startDate?: Date, endDate?: Date) => Promise<StockReturn[]>;
  addStockReturn: (data: NewStockReturnData) => Promise<void>;
  getStockReturnById: (returnId: string) => Promise<StockReturn | null>;
  // Stock Category/Unit/Brand/Expense Category Management
  addStockCategory: (category: string) => Promise<void>;
  deleteStockCategory: (category: string) => Promise<void>;
  addStockUnitType: (unitType: string) => Promise<void>;
  deleteStockUnitType: (unitType: string) => Promise<void>;
  addStockBrand: (brand: string) => Promise<void>;
  deleteStockBrand: (brand: string) => Promise<void>;
  addExpenseCategory: (category: string) => Promise<void>;
  deleteExpenseCategory: (category: string) => Promise<void>;
  // Employee Category Management
  addEmployeeLocation: (location: string) => Promise<void>;
  deleteEmployeeLocation: (location: string) => Promise<void>;
  addEmployeeDepartment: (department: string) => Promise<void>;
  deleteEmployeeDepartment: (department: string) => Promise<void>;
  addEmployeeDesignation: (designation: string) => Promise<void>;
  deleteEmployeeDesignation: (designation: string) => Promise<void>;
  addEmployeeShift: (shift: string) => Promise<void>;
  deleteEmployeeShift: (shift: string) => Promise<void>;
  // POS Sale Management
  addPOSSale: (data: NewPOSSaleData) => Promise<POSSale>;
  getPOSSales: (startDate?: Date, endDate?: Date) => Promise<POSSale[]>;
  getPOSSaleById: (saleId: string) => Promise<POSSale | null>;
  deletePOSSale: (saleId: string) => Promise<void>;
  updatePOSSalePayment: (saleId: string, payment: Omit<Payment, 'date' | 'id' | 'recordedBy'>) => Promise<void>;
  updatePOSSalePaymentDetails: (saleId: string, payment: Payment) => Promise<void>;
  deletePOSSalePayment: (saleId: string, paymentId: string) => Promise<void>;
  // Peripheral Management
  getPeripherals: () => Promise<Peripheral[]>;
  getPeripheralById: (id: string) => Promise<Peripheral | null>;
  addPeripheral: (data: NewPeripheralData) => Promise<string>;
  updatePeripheral: (id: string, data: PeripheralUpdateData) => Promise<void>;
  deletePeripheral: (id: string) => Promise<void>;
  // Vendor Management
  getVendors: () => Promise<Vendor[]>;
  getVendorById: (vendorId: string) => Promise<Vendor | null>;
  addVendor: (data: NewVendorData) => Promise<void>;
  updateVendor: (vendorId: string, data: VendorUpdateData) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  updateVendorStatus: (vendorId: string, status: 'active' | 'inactive') => Promise<void>;
  // Payroll Management
  getPayrollRuns: () => Promise<PayrollRun[]>;
  createPayrollRun: (period: string) => Promise<string>;
  updatePayrollRun: (runId: string, data: Partial<Omit<PayrollRun, 'id' | 'hospitalId'>>) => Promise<void>;
  deletePayrollRun: (runId: string) => Promise<void>;
  getEmployees: () => Promise<Employee[]>;
  getEmployeeById: (employeeId: string) => Promise<Employee | null>;
  addEmployee: (data: NewEmployeeData) => Promise<void>;
  updateEmployee: (employeeId: string, data: Partial<NewEmployeeData>) => Promise<void>;
  reviseEmployeeSalary: (employeeId: string, newCTC: number, newGroupId: string) => Promise<void>;
  // FIX: Add missing 'updateEmployeeStatus' to AuthContextType.
  updateEmployeeStatus: (employeeId: string, status: 'active' | 'inactive') => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  getSalaryComponents: () => Promise<SalaryComponent[]>;
  addSalaryComponent: (data: NewSalaryComponentData) => Promise<void>;
  updateSalaryComponent: (id: string, data: NewSalaryComponentData) => Promise<void>;
  deleteSalaryComponent: (id: string) => Promise<void>;
  getSalaryGroups: () => Promise<SalaryGroup[]>;
  addSalaryGroup: (data: NewSalaryGroupData) => Promise<void>;
  updateSalaryGroup: (id: string, data: NewSalaryGroupData) => Promise<void>;
  deleteSalaryGroup: (id: string) => Promise<void>;
  // Payroll Bonus Management
  getMonthlyBonuses: () => Promise<MonthlyBonus[]>;
  addMonthlyBonus: (data: NewMonthlyBonusData) => Promise<void>;
  updateMonthlyBonus: (bonusId: string, data: NewMonthlyBonusData) => Promise<void>;
  deleteMonthlyBonus: (bonusId: string) => Promise<void>;
  // Loan Management
  getLoans: () => Promise<Loan[]>;
  getLoanById: (loanId: string) => Promise<Loan | null>;
  addLoan: (data: NewLoanData) => Promise<void>;
  updateLoanStatus: (loanId: string, status: LoanStatus) => Promise<void>;
  // FIX: Add state for the global invoice print preview modal to the AuthContextType.
  // Print Management
  invoiceToPrint: { invoice: Invoice | POSSale; type: 'Treatment' | 'POS' } | null;
  setInvoiceToPrint: (data: { invoice: Invoice | POSSale; type: 'Treatment' | 'POS' } | null) => void;
  getUsersForHospital: () => Promise<UserDocument[]>;
}