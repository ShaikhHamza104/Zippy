// client/src/components/common/PincodeModal.jsx
import React, { useState } from 'react';
import { MapPin, Navigation, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Modal, Button, Input } from '../ui/index.js';
import { useUIStore } from '../../stores/uiStore.js';
import { apiFetch } from '../../services/api.js';

const POPULAR_HUBS = [
  { city: 'Bengaluru', pin: '560001' },
  { city: 'Mumbai', pin: '400001' },
  { city: 'New Delhi', pin: '110001' },
  { city: 'Hyderabad', pin: '500001' },
  { city: 'Pune', pin: '411001' },
];

export const PincodeModal = () => {
  const { isPincodeModalOpen, togglePincodeModal, deliveryPincode, setPincode, addToast } =
    useUIStore();
  const [inputPin, setInputPin] = useState(deliveryPincode || '');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyAndSelect = async (pin) => {
    const cleanPin = String(pin).trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setError('Please enter a valid 6-digit Indian PIN code');
      return;
    }

    try {
      setIsChecking(true);
      setError('');
      setStatusMessage(null);

      const res = await apiFetch(`/api/v1/serviceability/${cleanPin}`);
      const serviceData = res?.data;

      if (serviceData?.serviceable) {
        setStatusMessage({
          type: 'success',
          hubName: serviceData.hubName,
          eta: serviceData.estimatedDeliveryMinutes || 10,
          city: serviceData.city,
        });

        addToast({
          type: 'success',
          title: `Delivering to ${serviceData.city}`,
          message: `${serviceData.hubName} ready for 10-minute delivery.`,
        });

        // Close after brief moment to display confirmation
        setTimeout(() => {
          setPincode(cleanPin);
          setStatusMessage(null);
        }, 1000);
      } else {
        setStatusMessage({
          type: 'warning',
          message:
            serviceData?.message ||
            'Zippy 10-minute delivery is not yet serviceable here. We are actively expanding!',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to verify PIN code serviceability.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerifyAndSelect(inputPin);
  };

  return (
    <Modal
      isOpen={isPincodeModalOpen}
      onClose={() => togglePincodeModal(false)}
      title="Select Delivery Location"
      description="Enter your PIN code to check live dark-store coverage and 10-minute delivery promise."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            id="pincode-input"
            label="6-Digit PIN Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="e.g. 560001"
            value={inputPin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setInputPin(val);
              if (error) setError('');
              if (statusMessage) setStatusMessage(null);
            }}
            error={error}
            leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
            autoFocus
          />
        </div>

        {/* Live Serviceability Feedback */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              {statusMessage.type === 'success' ? (
                <>
                  <div className="font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Serviceable from {statusMessage.hubName}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Guaranteed delivery in {statusMessage.eta} minutes to {statusMessage.city}.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold">Unserviceable Location</div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-300">
                    {statusMessage.message}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Active Quick-Commerce Hubs
          </label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_HUBS.map((hub) => (
              <button
                key={hub.pin}
                type="button"
                onClick={() => {
                  setInputPin(hub.pin);
                  handleVerifyAndSelect(hub.pin);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  deliveryPincode === hub.pin
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-700 dark:text-brand-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {hub.city} ({hub.pin})
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => togglePincodeModal(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isChecking}
            leftIcon={<Navigation className="w-4 h-4" />}
          >
            Check & Apply
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PincodeModal;
