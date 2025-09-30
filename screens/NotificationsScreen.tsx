import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { NotificationSettings, NotificationTemplate, EmailSettings } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faUndo, faEnvelope, faCalendarCheck, faReceipt, faBirthdayCake, faUser, faHospital, faClock, faFileInvoiceDollar, faStore, faIdCard, faPaperPlane, faWrench, faFileLines } from '@fortawesome/free-solid-svg-icons';
import Select from '../components/ui/Select';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';


type NotificationType = keyof NotificationSettings;

const defaultSettings: NotificationSettings = {
    welcomeMessage: {
        enabled: true,
        template: { subject: 'Welcome to {{hospitalName}}!', body: `Dear {{patientName}},

Welcome to our hospital, {{hospitalName}}. We are glad to have you with us.

Best regards,
The Team` }
    },
    appointmentReminder: {
        enabled: true, daysBefore: 1, time: '09:00',
        template: { subject: 'Appointment Reminder from {{hospitalName}}', body: `Hi {{patientName}},

This is a reminder for your upcoming appointment on {{appointmentDate}} at {{appointmentTime}} with Dr. {{doctorName}} for {{treatmentName}}.

See you soon,
{{hospitalName}}` }
    },
    posSaleInvoice: {
        enabled: true,
        template: { subject: 'Your Invoice from {{hospitalName}}', body: `Dear {{patientName}},

Please find your invoice attached for your recent purchase.

Total Amount: {{totalAmount}}

Thank you,
{{hospitalName}}` }
    },
    treatmentInvoice: {
        enabled: true,
        template: { subject: 'Your Invoice from {{hospitalName}}', body: `Dear {{patientName}},

Please find your invoice attached for your recent treatment.

Total Amount: {{totalAmount}}

Thank you,
{{hospitalName}}` }
    },
    birthdayWish: {
        enabled: false,
        template: { subject: 'Happy Birthday from {{hospitalName}}!', body: `Dear {{patientName}},

{{hospitalName}} wishes you a very happy birthday and a wonderful year ahead!

Warmly,
The Team` }
    }
};

const placeholders: Record<NotificationType, { key: string, description: string }[]> = {
    welcomeMessage: [
        { key: '{{patientName}}', description: 'Patient\'s full name' },
        { key: '{{hospitalName}}', description: 'Your hospital\'s name' },
    ],
    appointmentReminder: [
        { key: '{{patientName}}', description: 'Patient\'s full name' },
        { key: '{{hospitalName}}', description: 'Your hospital\'s name' },
        { key: '{{appointmentDate}}', description: 'Date of the appointment' },
        { key: '{{appointmentTime}}', description: 'Time of the appointment' },
        { key: '{{doctorName}}', description: 'Doctor\'s name' },
        { key: '{{treatmentName}}', description: 'Treatment name' },
    ],
    posSaleInvoice: [
        { key: '{{patientName}}', description: 'Patient\'s name' },
        { key: '{{hospitalName}}', description: 'Your hospital\'s name' },
        { key: '{{invoiceId}}', description: 'The invoice ID' },
        { key: '{{totalAmount}}', description: 'Total amount of the invoice' },
    ],
    treatmentInvoice: [
        { key: '{{patientName}}', description: 'Patient\'s name' },
        { key: '{{hospitalName}}', description: 'Your hospital\'s name' },
        { key: '{{invoiceId}}', description: 'The invoice ID' },
        { key: '{{totalAmount}}', description: 'Total amount of the invoice' },
    ],
    birthdayWish: [
        { key: '{{patientName}}', description: 'Patient\'s full name' },
        { key: '{{hospitalName}}', description: 'Your hospital\'s name' },
    ],
};

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
    <button onClick={() => onChange(!enabled)} className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500 ${enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <span className={`inline-block w-5 h-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

interface EditTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: NotificationTemplate) => void;
    template: NotificationTemplate;
    placeholders: { key: string, description: string }[];
    notificationType: NotificationType;
    onReset: () => void;
}

const EditTemplateModal: React.FC<EditTemplateModalProps> = ({ isOpen, onClose, onSave, template, placeholders, onReset }) => {
    const [currentTemplate, setCurrentTemplate] = useState(template);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setCurrentTemplate(template); }, [template]);
    
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl m-4">
                <div className="p-6 border-b"><h2 className="text-xl font-bold">Edit Email Template</h2></div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto">
                    <div className="md:col-span-2 space-y-4">
                        <Input label="Email Subject" value={currentTemplate.subject} onChange={e => setCurrentTemplate(t => ({...t, subject: e.target.value}))}/>
                        <Textarea label="Email Body" value={currentTemplate.body} onChange={e => setCurrentTemplate(t => ({...t, body: e.target.value}))} rows={12} />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Available Placeholders</h4>
                        <div className="space-y-2 text-sm">
                            {placeholders.map(p => (
                                <div key={p.key} className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                    <code className="font-mono text-blue-600 dark:text-blue-400">{p.key}</code>
                                    <p className="text-xs text-slate-500">{p.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t">
                    <Button type="button" variant="light" onClick={onReset}><FontAwesomeIcon icon={faUndo} className="mr-2"/>Reset to Default</Button>
                    <div className="flex gap-2">
                        <Button type="button" variant="light" onClick={onClose}><FontAwesomeIcon icon={faTimes} className="mr-2"/>Cancel</Button>
                        <Button type="button" variant="primary" onClick={() => onSave(currentTemplate)}><FontAwesomeIcon icon={faSave} className="mr-2"/>Save Template</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NotificationsScreen: React.FC = () => {
    const { user, updateEmailSettings, updateNotificationSettings } = useAuth();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
    const [emailSettings, setEmailSettings] = useState<EmailSettings>({
        fromEmail: '',
        apiKey: ''
    });
    const [editing, setEditing] = useState<NotificationType | null>(null);
    const [testEmailLoading, setTestEmailLoading] = useState<NotificationType | null>(null);
    const [loading, setLoading] = useState(false);

    const notificationList: {type: NotificationType; icon: IconDefinition; title: string; description: string;}[] = [
        {type: 'welcomeMessage', icon: faUser, title: 'Welcome Message', description: 'Send a welcome email when a new patient is registered.'},
        {type: 'appointmentReminder', icon: faCalendarCheck, title: 'Appointment Reminder', description: 'Send an email reminder before a scheduled appointment.'},
        {type: 'treatmentInvoice', icon: faFileInvoiceDollar, title: 'Treatment Invoice', description: 'Automatically email the invoice after a consultation is completed.'},
        {type: 'posSaleInvoice', icon: faStore, title: 'POS Sale Invoice', description: 'Automatically email the invoice after a POS sale is completed.'},
        {type: 'birthdayWish', icon: faBirthdayCake, title: 'Birthday Wish', description: 'Send an automated birthday greeting to patients on their birthday.'},
    ];

    useEffect(() => {
        if (user?.hospitalNotificationSettings) {
             setSettings(prev => ({
                ...defaultSettings,
                ...JSON.parse(JSON.stringify(user.hospitalNotificationSettings)) // Deep merge
            }));
        }
        if (user?.hospitalEmailSettings) {
            setEmailSettings(user.hospitalEmailSettings);
        }
    }, [user]);

    const handleToggle = async (type: NotificationType, enabled: boolean) => {
        const newSettings = { ...settings[type], enabled };
        setSettings(s => ({...s, [type]: newSettings})); // Optimistic UI update
        try {
            await updateNotificationSettings({ [type]: newSettings });
            addToast('Setting updated!', 'success');
        } catch (error) {
            addToast('Failed to update setting.', 'error');
            setSettings(s => ({...s, [type]: { ...s[type], enabled: !enabled }}));
        }
    };
    
    const handleSaveTemplate = async (template: NotificationTemplate) => {
        if (!editing) return;
        const newSettings = { ...settings[editing], template };
        setSettings(s => ({...s, [editing]: newSettings}));
        try {
            await updateNotificationSettings({ [editing]: newSettings });
            addToast('Template saved!', 'success');
        } catch (error) {
            addToast('Failed to save template.', 'error');
        } finally {
            setEditing(null);
        }
    };

    const handleResetTemplate = () => {
        if (!editing) return;
        const defaultTemplate = defaultSettings[editing].template;
        handleSaveTemplate(defaultTemplate);
    };

    const handleReminderConfigChange = async (field: 'daysBefore' | 'time', value: string | number) => {
        const newConfig = { ...settings.appointmentReminder, [field]: value };
        setSettings(s => ({...s, appointmentReminder: newConfig }));
         try {
            await updateNotificationSettings({ appointmentReminder: newConfig });
            addToast('Reminder setting updated!', 'success');
        } catch (error) {
            addToast('Failed to update setting.', 'error');
        }
    };

    const handleSendTestEmail = async (type: NotificationType) => {
        if (!user || !user.email) {
            addToast("Your user email is not configured.", "error");
            return;
        }
        const notificationInfo = notificationList.find(n => n.type === type);
        if (!notificationInfo) return;

        setTestEmailLoading(type);

        try {
            const result = await sendEmail(type, user);
            
            if (result.success) {
                addToast(result.message, 'success');
            } else {
                addToast(result.message, 'error');
            }
        } catch (error: any) {
            addToast(error.message || "An unexpected error occurred.", "error");
        } finally {
            setTestEmailLoading(null);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateEmailSettings(emailSettings);
            addToast("Email configuration saved successfully!", "success");
        } catch (error) {
            addToast("Failed to save configuration.", "error");
        } finally {
            setLoading(false);
        }
    };

    const canWrite = user?.permissions?.notifications === 'write';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            {editing && <EditTemplateModal isOpen={true} onClose={() => setEditing(null)} onSave={handleSaveTemplate} onReset={handleResetTemplate} template={settings[editing].template} placeholders={placeholders[editing]} notificationType={editing}/>}
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold">Email Configuration</h2>
                    <Input 
                        label="From Email" 
                        type="email" 
                        placeholder="notifications@yourhospital.com" 
                        value={emailSettings.fromEmail} 
                        onChange={e => setEmailSettings(s => ({ ...s, fromEmail: e.target.value }))} 
                        required 
                        disabled={!canWrite}
                    />
                    <Input 
                        label="SendGrid API Key" 
                        type="password" 
                        value={emailSettings.apiKey} 
                        onChange={e => setEmailSettings(s => ({ ...s, apiKey: e.target.value }))} 
                        disabled={!canWrite}
                    />
                </div>
                {canWrite && (
                    <div className="flex justify-end gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="primary" onClick={handleSave} disabled={loading}>
                            <FontAwesomeIcon icon={faSave} className="mr-2"/>
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </div>
                )}
            </div>

            <h2 className="text-xl font-bold pt-4">Notification Templates</h2>
            {notificationList.map(({ type, icon, title, description }) => (
                 <div key={type} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                    <div className="p-6 flex justify-between items-start">
                       <div className="flex items-start">
                            <FontAwesomeIcon icon={icon} className="h-6 w-6 text-slate-400 mt-1"/>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold">{title}</h3>
                                <p className="text-sm text-slate-500">{description}</p>
                            </div>
                       </div>
                       <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                            {canWrite && <Button variant="light" size="sm" onClick={() => handleSendTestEmail(type)} disabled={!!testEmailLoading}>{testEmailLoading === type ? 'Sending...' : <><FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Test Mail</>}</Button>}
                            {canWrite && <Button variant="light" size="sm" onClick={() => setEditing(type)}>Edit Template</Button>}
                            {canWrite ? <ToggleSwitch enabled={settings[type].enabled} onChange={(val) => handleToggle(type, val)} /> : <span className={`text-sm font-bold ${settings[type].enabled ? 'text-green-600' : 'text-slate-500'}`}>{settings[type].enabled ? 'Enabled' : 'Disabled'}</span>}
                       </div>
                    </div>
                    {type === 'appointmentReminder' && settings[type].enabled && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                           <Select label="Send Reminder" value={settings.appointmentReminder.daysBefore} onChange={e => handleReminderConfigChange('daysBefore', parseInt(e.target.value))} disabled={!canWrite}>
                               <option value={1}>1 Day Before</option>
                               <option value={2}>2 Days Before</option>
                               <option value={3}>3 Days Before</option>
                           </Select>
                           <Input label="At Time" type="time" value={settings.appointmentReminder.time} onChange={e => handleReminderConfigChange('time', e.target.value)} disabled={!canWrite}/>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default NotificationsScreen;