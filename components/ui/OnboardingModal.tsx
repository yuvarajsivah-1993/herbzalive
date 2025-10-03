import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import FileInput from './FileInput';
import Avatar from './Avatar';
import { Address, HospitalUpdateData, UserUpdateData } from '../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowLeft, faCheckCircle, faCamera } from '@fortawesome/free-solid-svg-icons';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const timezones = [
    "(UTC-12:00) International Date Line West",
    "(UTC-05:00) Eastern Time (US & Canada)",
    "(UTC+00:00) Coordinated Universal Time",
    "(UTC+01:00) West Central Africa",
    "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
    "(UTC+08:00) Beijing, Perth, Singapore, Hong Kong",
    "(UTC+10:00) Eastern Australia, Guam, Vladivostok",
];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { user, updateHospitalSettings, completeHospitalOnboarding, updateUser } = useAuth();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<HospitalUpdateData & { profilePhoto: File | string | null }>({
    name: '', phone: '', email: '',
    address: { street: '', city: '', state: '', country: '', pincode: '' },
    logo: null, currency: 'USD', timezone: '', dateFormat: 'DD/MM/YYYY',
    timeFormat: '12-hour', financialYearStartMonth: 'April',
    gstin: '', dlNo: '', cinNo: '', fssaiNo: '', website: '', telephone: '',
    profilePhoto: null,
  });

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.hospitalName || '', phone: user.hospitalPhone || '', email: user.hospitalEmail || '',
        address: {
          street: user.hospitalAddress?.street || '',
          city: user.hospitalAddress?.city || '',
          state: user.hospitalAddress?.state || '',
          country: user.hospitalAddress?.country || '',
          pincode: user.hospitalAddress?.pincode || '',
        },
        logo: null, currency: user.hospitalCurrency || 'USD', timezone: user.hospitalTimezone || '',
        dateFormat: user.hospitalDateFormat || 'DD/MM/YYYY', timeFormat: user.hospitalTimeFormat || '12-hour',
        financialYearStartMonth: user.hospitalFinancialYearStartMonth || 'April',
        gstin: user.hospitalGstin || '', dlNo: user.hospitalDlNo || '', cinNo: user.hospitalCinNo || '',
        fssaiNo: user.hospitalFssaiNo || '', website: user.hospitalWebsite || '', telephone: user.hospitalTelephone || '',
        profilePhoto: user.profilePhotoUrl || null,
      });
    }
  }, [user, isOpen]);

  const handleInputChange = (field: keyof HospitalUpdateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
  };

  const handleProfilePhotoChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, profilePhoto: file }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (currentStep === 1) {
        if (formData.profilePhoto instanceof File && user?.id) {
          await updateUser(user.id, { profilePhoto: formData.profilePhoto });
          addToast("Profile photo updated!", "success");
        }
        setCurrentStep(prev => prev + 1);
      } else if (user?.hospitalId) {
        await updateHospitalSettings(formData);
        addToast("Settings saved!", "success");
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      addToast("Failed to save settings.", "error");
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      if (user?.hospitalId) {
        if (formData.profilePhoto instanceof File && user?.id) {
          await updateUser(user.id, { profilePhoto: formData.profilePhoto });
          addToast("Profile photo updated!", "success");
        }
        await updateHospitalSettings(formData); // Save final step data
        await completeHospitalOnboarding(user.hospitalId); // Mark onboarding complete
        addToast("Onboarding complete! Welcome to the app.", "success");
        onClose();
      }
    } catch (error) {
      addToast("Failed to complete onboarding.", "error");
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-2xl w-full m-4 text-center">

        {currentStep === 1 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Welcome, {user?.name || 'Hospital Owner'}!</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Thank you for joining our Hospital Management System. Let's quickly set up some essential details to get you started.
            </p>
            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer mb-4" onClick={handleAvatarClick}>
                <Avatar 
                  avatar={{
                    type: (formData.profilePhoto instanceof File || user?.profilePhotoUrl) ? 'image' : 'initials',
                    value: (formData.profilePhoto instanceof File && formData.profilePhoto) ? URL.createObjectURL(formData.profilePhoto) : (user?.profilePhotoUrl || user?.name?.charAt(0).toUpperCase() || 'HO'),
                  }}
                  className="h-24 w-24 text-4xl" 
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <FontAwesomeIcon icon={faCamera} className="text-white text-2xl" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleProfilePhotoChange(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Click "Next" to configure your localization, financial, business, and tax information.
            </p>
          </div>
        )}

        {currentStep === 2 && (
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4">Localization & Financial Settings</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Configure your regional and financial preferences.
            </p>
            <div className="space-y-4">
              <Select label="Currency" value={formData.currency} onChange={e => handleInputChange('currency', e.target.value)}>
                <option value="USD">USD ($)</option><option value="INR">INR (₹)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
              </Select>
              <Select label="Timezone" value={formData.timezone} onChange={e => handleInputChange('timezone', e.target.value)}>
                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </Select>
              <Select label="Date Format" value={formData.dateFormat} onChange={e => handleInputChange('dateFormat', e.target.value)}>
                <option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option>
              </Select>
              <Select label="Time Format" value={formData.timeFormat} onChange={e => handleInputChange('timeFormat', e.target.value)}>
                <option>12-hour</option><option>24-hour</option>
              </Select>
              <Select label="Financial Year Start" value={formData.financialYearStartMonth} onChange={e => handleInputChange('financialYearStartMonth', e.target.value)}>
                {months.map(month => <option key={month} value={month}>{month}</option>)}
              </Select>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4">Business & Tax Information</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Provide your business and tax registration details.
            </p>
            <div className="space-y-4">
              <Input label="Telephone No." type="tel" value={formData.telephone} onChange={e => handleInputChange('telephone', e.target.value)} />
              <Input label="GSTIN No" value={formData.gstin} onChange={e => handleInputChange('gstin', e.target.value)} />
              <Input label="DL No" value={formData.dlNo} onChange={e => handleInputChange('dlNo', e.target.value)} />
              <Input label="CIN No" value={formData.cinNo} onChange={e => handleInputChange('cinNo', e.target.value)} />
              <Input label="FSSAI No" value={formData.fssaiNo} onChange={e => handleInputChange('fssaiNo', e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <Button variant="secondary" onClick={() => setCurrentStep(prev => prev - 1)} disabled={loading}>
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Previous
            </Button>
          )}
          {currentStep < 3 ? (
            <Button variant="primary" onClick={handleNext} disabled={loading} className="ml-auto">
              Next <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Button>
          ) : (
            <Button variant="success" onClick={handleFinish} disabled={loading} className="ml-auto">
              {loading ? 'Finishing...' : 'Finish Onboarding'} <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;