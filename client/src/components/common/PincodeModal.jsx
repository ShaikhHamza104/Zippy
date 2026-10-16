// client/src/components/common/PincodeModal.jsx
import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Modal, Button, Input } from '../ui/index.js';
import { useUIStore } from '../../stores/uiStore.js';

const POPULAR_HUBS = [
  { city: 'Bangalore', pin: '560001' },
  { city: 'Mumbai', pin: '400001' },
  { city: 'Delhi', pin: '110001' },
  { city: 'Hyderabad', pin: '500001' },
  { city: 'Pune', pin: '411001' },
];

export const PincodeModal = () => {
  const { isPincodeModalOpen, togglePincodeModal, deliveryPincode, setPincode, addToast } =
    useUIStore();
  const [inputPin, setInputPin] = useState(deliveryPincode || '');
  const [error, setError] = useState('');

  const handleSelect = (pin) => {
    setPincode(pin);
    addToast({
      type: 'success',
      title: 'Delivery Location Set',
      message: `Delivering orders in 10 minutes to ${pin}`,
    });
    togglePincodeModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanPin = inputPin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setError('Please enter a valid 6-digit Indian PIN code');
      return;
    }
    setError('');
    handleSelect(cleanPin);
  };

  return (
    <Modal
      isOpen={isPincodeModalOpen}
      onClose={() => togglePincodeModal(false)}
      title="Select Delivery Location"
      description="Enter your PIN code to see exact product availability and 10-minute delivery promise."
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
            }}
            error={error}
            leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">
            Popular Quick-Commerce Hubs
          </label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_HUBS.map((hub) => (
              <button
                key={hub.pin}
                type="button"
                onClick={() => {
                  setInputPin(hub.pin);
                  handleSelect(hub.pin);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  deliveryPincode === hub.pin
                    ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
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
          <Button type="submit" variant="primary" leftIcon={<Navigation className="w-4 h-4" />}>
            Apply PIN Code
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PincodeModal;
