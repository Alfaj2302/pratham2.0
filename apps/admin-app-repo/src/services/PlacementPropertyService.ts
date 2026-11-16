import { patch, post } from './RestClient';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';

export const PlacementPropertyStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export interface PlacementPropertySearchParam {
  propertyName?: string;
  stateId?: string;
  districtId?: string;
  pincode?: string;
  industry?: string;
  domain?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const searchPlacementProperties = async (
  data: PlacementPropertySearchParam
): Promise<any> => {
  try {
    const response = await post(API_ENDPOINTS.placementPropertySearch, data);
    return response?.data;
  } catch (error) {
    console.error('Error searching placement properties', error);
    throw error;
  }
};

export const createPlacementProperty = async (data: any): Promise<any> => {
  try {
    const response = await post(API_ENDPOINTS.placementPropertyCreate, data);
    return response?.data;
  } catch (error) {
    console.error('Error creating placement property', error);
    throw error;
  }
};

export const updatePlacementProperty = async (data: any): Promise<any> => {
  try {
    const response = await patch(API_ENDPOINTS.placementPropertyUpdate, data);
    return response?.data;
  } catch (error) {
    console.error('Error updating placement property', error);
    throw error;
  }
};

export const updatePlacementPropertyStatus = async (data: {
  placementPropertyId: string;
  status: string;
}): Promise<any> => {
  try {
    const response = await patch(API_ENDPOINTS.placementPropertyStatus, data);
    return response?.data;
  } catch (error) {
    console.error('Error updating placement property status', error);
    throw error;
  }
};
