// server/src/services/serviceability.service.js

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// Known active dark store hubs and service zones
const ACTIVE_HUBS = [
  {
    prefix: '400',
    min: 400001,
    max: 400104,
    city: 'Mumbai',
    state: 'Maharashtra',
    hubName: 'Zippy Mumbai Central Dark Store',
    estimatedMinutes: 10,
    freeDeliveryThreshold: 199,
    deliveryFee: 15,
    minOrderAmount: 49,
  },
  {
    prefix: '110',
    min: 110001,
    max: 110096,
    city: 'New Delhi',
    state: 'Delhi',
    hubName: 'Zippy Delhi NCR Dark Store',
    estimatedMinutes: 10,
    freeDeliveryThreshold: 199,
    deliveryFee: 15,
    minOrderAmount: 49,
  },
  {
    prefix: '560',
    min: 560001,
    max: 560103,
    city: 'Bengaluru',
    state: 'Karnataka',
    hubName: 'Zippy Koramangala Dark Store',
    estimatedMinutes: 12,
    freeDeliveryThreshold: 199,
    deliveryFee: 15,
    minOrderAmount: 49,
  },
  {
    prefix: '411',
    min: 411001,
    max: 411060,
    city: 'Pune',
    state: 'Maharashtra',
    hubName: 'Zippy Pune Camp Dark Store',
    estimatedMinutes: 12,
    freeDeliveryThreshold: 199,
    deliveryFee: 15,
    minOrderAmount: 49,
  },
  {
    prefix: '500',
    min: 500001,
    max: 500095,
    city: 'Hyderabad',
    state: 'Telangana',
    hubName: 'Zippy Hitech City Dark Store',
    estimatedMinutes: 10,
    freeDeliveryThreshold: 199,
    deliveryFee: 15,
    minOrderAmount: 49,
  },
];

/**
 * Checks serviceability and dark store coverage for a given 6-digit Indian postal code.
 *
 * @param {string} pincode
 * @returns {{
 *   pincode: string,
 *   serviceable: boolean,
 *   city?: string,
 *   state?: string,
 *   hubName?: string,
 *   estimatedDeliveryMinutes?: number,
 *   freeDeliveryThreshold?: number,
 *   deliveryFee?: number,
 *   minOrderAmount?: number,
 *   message?: string
 * }}
 */
export const checkPincodeServiceability = (pincode) => {
  const cleanPincode = String(pincode).trim();

  if (!PINCODE_REGEX.test(cleanPincode)) {
    return {
      pincode: cleanPincode,
      serviceable: false,
      message: 'Invalid pincode format. Must be a valid 6-digit Indian postal code.',
    };
  }

  const numCode = parseInt(cleanPincode, 10);
  const matchedHub = ACTIVE_HUBS.find(
    (hub) => cleanPincode.startsWith(hub.prefix) && numCode >= hub.min && numCode <= hub.max
  );

  if (matchedHub) {
    return {
      pincode: cleanPincode,
      serviceable: true,
      city: matchedHub.city,
      state: matchedHub.state,
      hubName: matchedHub.hubName,
      estimatedDeliveryMinutes: matchedHub.estimatedMinutes,
      freeDeliveryThreshold: matchedHub.freeDeliveryThreshold,
      deliveryFee: matchedHub.deliveryFee,
      minOrderAmount: matchedHub.minOrderAmount,
      message: `Lightning delivery in ${matchedHub.estimatedMinutes} mins available in ${matchedHub.city}!`,
    };
  }

  return {
    pincode: cleanPincode,
    serviceable: false,
    message:
      'Zippy 10-minute delivery is not yet serviceable in this location. We are rapidly expanding our dark store coverage!',
  };
};
