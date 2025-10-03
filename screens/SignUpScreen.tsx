// FIX: Update react-router-dom import for v5 compatibility
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHeart, faEnvelope, faLock, faUser, faBuilding, faPhone, faCheckCircle, faMobileAlt } from '@fortawesome/free-solid-svg-icons';
import { db } from '../services/firebase';
import { Address, SignUpData, UserDocument, PatientDocument } from '../types';
import FileInput from '../components/ui/FileInput';
import { useToast } from '../hooks/useToast';


const SignUpScreen: React.FC = () => {
  const [step, setStep] = useState(1);

  // Step 1: Identifier
  const [identifier, setIdentifier] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  
  // Step 2: Hospital Info
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [hospitalStreet, setHospitalStreet] = useState('');
  const [hospitalCity, setHospitalCity] = useState('');
  const [hospitalState, setHospitalState] = useState('');
  const [hospitalCountry, setHospitalCountry] = useState('');
  const [hospitalPincode, setHospitalPincode] = useState('');
  const [hospitalLogo, setHospitalLogo] = useState<File | null>(null);

  // Step 3: User Info
  const [name, setName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'staff' | 'patient' | 'new_hospital' | null>(null);
  const [foundData, setFoundData] = useState<UserDocument | PatientDocument | null>(null);
  const { signup } = useAuth();
  const { addToast } = useToast();

  const handleIdentifierCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError("Please enter an email or phone number.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Check for invited staff/admin
      let usersRef = db.collection("users");
      let q = usersRef.where("email", "==", identifier);
      let querySnapshot = await q.get();
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserDocument;
        if (userData.status === 'active') {
          throw new Error("This email is already registered as staff. Please log in.");
        }
        if (userData.status === 'invited') {
          setFoundData(userData);
          setUserType('staff');
          setLoginEmail(userData.email);
          setName(userData.name);
          setStep(2);
          return;
        }
      }

      // 2. Check for existing patient
      let patientsRef = db.collection("patients");
      let patientQuery = await patientsRef.where("email", "==", identifier).get();
      if (patientQuery.empty) {
          patientQuery = await patientsRef.where("phone", "==", identifier).get();
      }

      if (!patientQuery.empty) {
        const patientData = { id: patientQuery.docs[0].id, ...patientQuery.docs[0].data() } as PatientDocument;
        if (patientData.uid) {
          throw new Error("This patient account has already been activated. Please log in.");
        }
        setFoundData(patientData);
        setUserType('patient');
        setLoginEmail(patientData.email || ''); // Pre-fill if email exists
        setName(patientData.name);
        setStep(2);
        return;
      }
      
      // 3. New Hospital Signup
      setUserType('new_hospital');
      setLoginEmail(identifier); // Assume identifier is email for new hospital
      setStep(2);

    } catch (e: any) {
      setError(e.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    setError('');
    setUserType(null);
    setFoundData(null);
    setStep(1);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    let isPatientActivation = userType === 'patient';

    if (userType === 'new_hospital') {
      if (!name || !userPhone || !hospitalName || !hospitalPhone || !hospitalEmail || !hospitalStreet || !hospitalCity || !hospitalCountry || !hospitalPincode) {
        setError('Please fill all required fields for new hospital setup.');
        return;
      }
    } else if (userType === 'patient') {
      if (!loginEmail) {
        setError("An email address is required for your patient login.");
        return;
      }
    }

    setLoading(true);
    setError('');
    
    try {
        let formData: SignUpData;
        if (isPatientActivation) {
            const patient = foundData as PatientDocument;
            formData = {
                userEmail: loginEmail,
                userPassword: password,
                userName: patient.name,
                userPhone: patient.phone,
                userAddress: { street: patient.address, city: '', country: '', pincode: '' },
                hospitalName: '', hospitalPhone: '', hospitalAddress: { street: '', city: '', country: '', pincode: '' }
            }
        } else if (userType === 'staff') {
            const staff = foundData as UserDocument;
            formData = {
                userEmail: staff.email,
                userPassword: password,
                userName: staff.name,
                userPhone: staff.phone,
                userAddress: staff.address,
                hospitalName: '', hospitalPhone: '', hospitalAddress: { street: '', city: '', country: '', pincode: '' }
            };
        } else { // new_hospital
            const hospitalAddress: Address = { street: hospitalStreet, city: hospitalCity, state: hospitalState, country: hospitalCountry, pincode: hospitalPincode };
            formData = {
                hospitalName, hospitalPhone, hospitalEmail, hospitalAddress, 
                userName: name, userEmail: loginEmail, userPhone, userAddress: hospitalAddress, userPassword: password,
            };
            if (hospitalLogo) formData.hospitalLogo = hospitalLogo;
        }
        
        await signup(userType === 'staff', isPatientActivation, formData, isPatientActivation ? (foundData as PatientDocument).id : undefined);
        setStep(3); // Show success message

    } catch (error: any) {
        const errorMessage = error.message || 'An error occurred during sign up. Please try again.';
        setError(errorMessage);
        addToast(errorMessage, 'error');
    } finally {
        setLoading(false);
    }
  };


  const renderContent = () => {
    if (step === 1) {
      return (
        <form className="space-y-4" onSubmit={handleIdentifierCheck}>
          <Input id="identifier" label="Your Email or Phone Number" type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
          {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Checking...' : 'Continue'}
          </Button>
        </form>
      );
    }

    if (step === 2 && (userType === 'staff' || userType === 'patient')) {
      return (
        <form className="space-y-4" onSubmit={handleSignup}>
          <div className="text-center mb-6">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Welcome, {name}!</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Activate Your {userType} Account</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create a password to get started.</p>
          </div>
          { userType === 'patient' && !(foundData as PatientDocument)?.email &&
            <Input id="loginEmail" label="Login Email*" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required helperText="This email will be used for logging in."/>
          }
          { (userType === 'staff' || (userType === 'patient' && (foundData as PatientDocument)?.email)) &&
             <Input id="email" label="Your Email" type="email" value={loginEmail} disabled />
          }
          <hr className="my-4"/>
          <Input id="password" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} />
          <Input id="confirm-password" label="Confirm Password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} />
          {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
          <div className="flex items-center gap-4 mt-6">
            <Button type="button" onClick={handleBack} variant="light" className="w-full">Back</Button>
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Activate Account'}
            </Button>
          </div>
        </form>
      );
    }

    if (step === 2 && userType === 'new_hospital') {
      return (
         <form className="space-y-4" onSubmit={handleSignup}>
            <div className="text-center mb-6">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Step 2 of 2</p>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Hospital & Owner Information</h3>
            </div>
            <Input id="email" label="Login Email" type="email" value={loginEmail} disabled />
            <hr className="my-4 border-slate-200 dark:border-slate-700"/>
            <Input id="hospitalName" label="Hospital Name" type="text" required value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} icon={<FontAwesomeIcon icon={faBuilding} className="h-5 w-5 text-gray-400" />} />
            <Input id="hospitalPhone" label="Hospital Phone" type="tel" required value={hospitalPhone} onChange={(e) => setHospitalPhone(e.target.value)} icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
            <Input id="hospitalEmail" label="Hospital Email" type="email" required value={hospitalEmail} onChange={(e) => setHospitalEmail(e.target.value)} icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
            <Input id="hospitalStreet" label="Hospital Street" type="text" required value={hospitalStreet} onChange={(e) => setHospitalStreet(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input id="hospitalCity" label="City" type="text" required value={hospitalCity} onChange={(e) => setHospitalCity(e.target.value)} />
                <Input id="hospitalState" label="State" type="text" required value={hospitalState} onChange={(e) => setHospitalState(e.target.value)} />
                <Input id="hospitalPincode" label="Pincode" type="text" required value={hospitalPincode} onChange={(e) => setHospitalPincode(e.target.value)} />
            </div>
            <Input id="hospitalCountry" label="Country" type="text" required value={hospitalCountry} onChange={(e) => setHospitalCountry(e.target.value)} />
            <FileInput id="hospitalLogo" label="Hospital Logo (Optional)" onChange={(e) => setHospitalLogo(e.target.files ? e.target.files[0] : null)} />
            <hr className="my-4 border-slate-200 dark:border-slate-700"/>
            <Input id="name" label="Your Full Name (Owner)" type="text" required value={name} onChange={(e) => setName(e.target.value)} icon={<FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-400" />} />
            <Input id="userPhone" label="Your Phone (Owner)" type="tel" required value={userPhone} onChange={(e) => setUserPhone(e.target.value)} icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
            <Input id="password" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} />
            <Input id="confirm-password" label="Confirm Password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} />
            {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
            <div className="flex items-center gap-4 mt-6">
                <Button type="button" onClick={handleBack} variant="light" className="w-full">Back</Button>
                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
            </div>
        </form>
      );
    }
    
    if (step === 3) {
        return (
            <div className="space-y-4 text-center">
                <FontAwesomeIcon icon={faCheckCircle} className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Registration Successful!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    A verification link has been sent to <strong>{loginEmail}</strong>. Please check your inbox and follow the link to activate your account.
                </p>
                <Link to="/login" className="block w-full">
                    <Button variant="primary" className="w-full mt-4">
                        Proceed to Login
                    </Button>
                </Link>
            </div>
        );
    }

    return null;
  }

  const getTitle = () => {
    if (step === 1 || userType === 'new_hospital') return 'Create Your Account'; // Changed text here
    if (userType === 'patient') return 'Activate Your Patient Portal';
    if (userType === 'staff') return 'Complete Your Account';
    return 'Sign Up';
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <FontAwesomeIcon icon={faShieldHeart} className="mx-auto h-12 w-auto text-blue-600" />
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          {getTitle()}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <Card className="p-6 sm:px-10">
          {renderContent()}
           <div className="mt-6 text-center text-sm">
              <p className="text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default SignUpScreen;