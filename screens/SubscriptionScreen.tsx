import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock, faStar } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';

const PackageCard: React.FC<{
  planName: string;
  price: string;
  features: string[];
  isFeatured?: boolean;
}> = ({ planName, price, features, isFeatured }) => (
    <div className={`relative border rounded-lg p-8 flex flex-col ${isFeatured ? 'border-blue-500' : 'border-slate-300 dark:border-slate-700'}`}>
        {isFeatured && (
            <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
                <FontAwesomeIcon icon={faStar} className="mr-2" />
                Most Popular
            </div>
        )}
        <h3 className="text-2xl font-bold">{planName}</h3>
        <p className="mt-4 text-4xl font-extrabold">{price}<span className="text-base font-medium text-slate-500">/month</span></p>
        <ul className="mt-6 space-y-4 text-slate-600 dark:text-slate-400">
            {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 h-5 w-5 mr-3 mt-1 flex-shrink-0" />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
        <Button variant={isFeatured ? 'primary' : 'light'} className="mt-8 w-full">
            Choose Plan
        </Button>
    </div>
);

const SubscriptionScreen: React.FC = () => {
    const { logout } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
            <div className="text-center max-w-2xl">
                <FontAwesomeIcon icon={faClock} className="text-7xl text-yellow-500 mb-6" />
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200">Your Subscription Has Expired</h1>
                <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                    Your free trial or subscription period has ended. To continue using the Zendenta Portal, please choose a subscription plan below.
                </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                <PackageCard
                    planName="Basic"
                    price="₹4,900"
                    features={[
                        "Up to 10 staff members",
                        "Patient Management",
                        "Appointment Scheduling",
                        "Basic Reporting",
                        "Email Support"
                    ]}
                />
                <PackageCard
                    planName="Standard"
                    price="₹9,900"
                    features={[
                        "Up to 50 staff members",
                        "All Basic features",
                        "Stock Management",
                        "POS System",
                        "Advanced Reporting",
                        "Priority Email & Chat Support"
                    ]}
                    isFeatured
                />
                <PackageCard
                    planName="Premium"
                    price="₹19,900"
                    features={[
                        "Unlimited staff members",
                        "All Standard features",
                        "Multi-location support",
                        "Custom Integrations",
                        "Dedicated Account Manager",
                        "24/7 Phone Support"
                    ]}
                />
            </div>

            <Button variant="light" onClick={logout} className="mt-12">
                Logout
            </Button>
        </div>
    );
};

export default SubscriptionScreen;