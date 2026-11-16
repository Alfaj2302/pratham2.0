import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Grid, Typography, TextField, InputAdornment, Pagination, CircularProgress, Checkbox, FormControlLabel, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'next-i18next';
import Header from '../components/Header';
import RegistrationPieChart from '../components/UserRegistration/RegistrationPieChart';
import RegistrationTabs from '../components/UserRegistration/RegistrationTabs';
import UserCard from '../components/UserRegistration/UserCard';
import BottomActionBar from '../components/UserRegistration/BottomActionBar';
import AssignBatchModal from '../components/UserRegistration/AssignBatchModal';
import AssignBatchSuccessModal from '../components/UserRegistration/AssignBatchSuccessModal';
import MoreOptionsBottomSheet from '../components/UserRegistration/MoreOptionsBottomSheet';
import LocationDropdowns from '../components/UserRegistration/LocationDropdowns';
import { fetchUserList } from '../services/ManageUser';
import { editEditUser } from '../services/ProfileService';
import { getInterestedToJoinFieldId } from '../utils/helper';
import { getZatpatTestIdentifiers, getUserAssessmentStatus } from '../services/AssesmentService';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withRole from '../components/withRole';
import { TENANT_DATA } from '../../app.config';
import { LocationFilters } from '../components/UserRegistration/types';

const ALL_FILTER_VALUE = 'all';

const REGISTRATION_FILTERS_KEY = 'userRegistrationFilters';

function readStoredFilters(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REGISTRATION_FILTERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const UserRegistrationList = () => {
  const { t } = useTranslation();

  const [tabValue, setTabValue] = useState<string>(() => readStoredFilters().tabValue ?? 'pending');
  const [searchQuery, setSearchQuery] = useState<string>(() => readStoredFilters().searchQuery ?? '');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [assignBatchModalOpen, setAssignBatchModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedBatchName, setSelectedBatchName] = useState('');
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState<number>(() => readStoredFilters().currentPage ?? 1);
  const [locationFilters, setLocationFilters] = useState<LocationFilters>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('userRegistrationLocationFilters');
      if (!raw) return {};
      const stored = JSON.parse(raw);
      return {
        states:    stored.state    != null             ? [stored.state]    : undefined,
        districts: stored.district != null             ? [stored.district] : undefined,
        blocks:    stored.blocks?.length               ? stored.blocks     : undefined,
      };
    } catch {
      return {};
    }
  });
  const [modeOfLearning, setModeOfLearning] = useState<string>(() => readStoredFilters().modeOfLearning ?? ALL_FILTER_VALUE);
  const [assessmentAttemptsFilter, setAssessmentAttemptsFilter] = useState<string>(() => readStoredFilters().assessmentAttemptsFilter ?? ALL_FILTER_VALUE);
  const [chartTrigger, setChartTrigger] = useState(false);
  const [zatpatTestIdentifiers, setZatpatTestIdentifiers] = useState<string[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const limit = 50;

  const requestCounterRef = useRef(0);

  const getUserAssessmentAttemptCount = (user: any): number => {
    if (!user.assessmentStats || Object.keys(user.assessmentStats).length === 0) {
      return 0;
    }
    return Math.max(
      ...Object.values(user.assessmentStats).map(
        (stat: any) => stat.attempts?.length || 0
      )
    );
  };

  // Transform API response to match UserCard format
  const parseCallLogEntry = (
    value: unknown
  ): { date?: string; textValue?: string } | null => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return typeof value === 'object' ? value : null;
  };

  const transformUserData = (apiUser: any): any => {
    // Extract location from customFields
    const stateField = apiUser.customFields?.find((field: any) => field.label === 'STATE');
    const districtField = apiUser.customFields?.find((field: any) => field.label === 'DISTRICT');
    const blockField = apiUser.customFields?.find((field: any) => field.label === 'BLOCK');
    const villageField = apiUser.customFields?.find((field: any) => field.label === 'VILLAGE');
    const modeField = apiUser.customFields?.find((field: any) => field.label === 'WHAT_IS_YOUR_PREFERRED_MODE_OF_LEARNING');
    const callLogsField = apiUser.customFields?.find((field: any) => field.label === 'CALL_LOGS');

    const state = stateField?.selectedValues?.[0]?.value || '';
    const district = districtField?.selectedValues?.[0]?.value || '';
    const block = blockField?.selectedValues?.[0]?.value || '';
    const village = villageField?.selectedValues?.[0]?.value || '';
    const modeType = modeField?.selectedValues?.[0]?.value === 'remote' ? 'remote' : 'in-person';
    const inPersonMode = modeType === 'remote' ? t('USER_REGISTRATION.REMOTE_MODE') : t('USER_REGISTRATION.IN_PERSON_MODE');

    // Format date
    const registeredOn = apiUser.createdAt 
      ? new Date(apiUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    
    const birthDate = apiUser.dob 
      ? new Date(apiUser.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    // Generate numeric ID for display (using enrollmentId if available, otherwise hash of userId)
    let numericId: number;
    if (apiUser.enrollmentId) {
      const enrollmentNum = parseInt(apiUser.enrollmentId.replace('LMP-', ''), 10);
      if (!isNaN(enrollmentNum)) {
        numericId = enrollmentNum;
      } else {
        // Fallback: create hash from userId
        let hash = 0;
        for (let i = 0; i < apiUser.userId.length; i++) {
          const char = apiUser.userId.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        numericId = Math.abs(hash);
      }
    } else {
      // Create hash from userId
      let hash = 0;
      for (let i = 0; i < apiUser.userId.length; i++) {
        const char = apiUser.userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      numericId = Math.abs(hash);
    }

    return {
      id: numericId,
      name: apiUser.name || `${apiUser.firstName || ''} ${apiUser.middleName || ''} ${apiUser.lastName || ''}`.trim(),
      registeredOn,
      inPersonMode,
      location: {
        state,
        district,
        block,
        village,
      },
      phoneNumber: apiUser.mobile || '',
      email: apiUser.email || '',
      username: apiUser.username || '',
      birthDate,
      callLogs:
        Array.isArray(callLogsField?.selectedValues) && callLogsField.selectedValues.length > 0
          ? callLogsField.selectedValues
              .map((value: unknown) => parseCallLogEntry(value))
              .filter(
                (entry: { date?: string; textValue?: string } | null): entry is {
                  date?: string;
                  textValue?: string;
                } => Boolean(entry)
              )
              .map((entry: { date?: string; textValue?: string }) => ({
                date: entry.date || '',
                note: entry.textValue || '',
              }))
          : [],
      isNew: apiUser.tenantStatus === 'pending',
      preTestStatus: apiUser.tenantStatus === 'pending' ? 'pending' : 'completed',
      modeType,
      userId: apiUser.userId,
      enrollmentId: apiUser.enrollmentId,
      // Assessment data will be populated separately
      assessmentStats: {},
      totalAssessmentAttempts: 0,
      hasAssessments: false,
    };
  };

  // Fetch Zatpat test identifiers
  const fetchZatpatTestIdentifiers = useCallback(async () => {
    try {
      console.log('🔍 Fetching zatpat test identifiers...');
      const response = await getZatpatTestIdentifiers();
      console.log('🔍 Zatpat API response:', response);
      
      if (response?.result?.QuestionSet) {
        const identifiers = response.result.QuestionSet.map((item: any) => item.identifier);
        console.log('🔍 Extracted zatpat identifiers:', identifiers);
        setZatpatTestIdentifiers(identifiers);
        return identifiers;
      }
      console.log('⚠️ No zatpat tests found in response');
      return [];
    } catch (error) {
      console.error('❌ Error fetching zatpat test identifiers:', error);
      return [];
    }
  }, []);

  // Fetch user assessment status
  const fetchUserAssessments = useCallback(async (userIds: string[], identifiers?: string[]) => {
    if (!userIds.length) return {};
    
    setAssessmentLoading(true);
    try {
      console.log('🚀 Calling getUserAssessmentStatus API with userIds:', userIds);
      const response = await getUserAssessmentStatus(userIds);
      console.log('✅ getUserAssessmentStatus API Response:', response);
      if (response && Array.isArray(response)) {
        const assessmentMap: {[userId: string]: any} = {};
        const currentIdentifiers = identifiers || zatpatTestIdentifiers;
        
        response.forEach((userAssessment: any) => {
          if (userAssessment.userId && userAssessment.assessments) {
            // Filter assessments to only include those matching zatpat test identifiers
            console.log(`🔍 User ${userAssessment.userId} raw assessments:`, userAssessment.assessments?.length || 0);
            console.log(`🔍 Current zatpat identifiers:`, currentIdentifiers);
            console.log(`🔍 User assessments contentIds:`, userAssessment.assessments?.map((a: any) => a.contentId) || []);
            
            const filteredAssessments = userAssessment.assessments.filter((assessment: any) => {
              const isZatpatTest = currentIdentifiers.includes(assessment.contentId);
              console.log(`🔍 Assessment ${assessment.attemptId} - contentId: ${assessment.contentId} - isZatpatTest: ${isZatpatTest}`);
              return isZatpatTest;
            });
            
            console.log(`🔍 User ${userAssessment.userId} filtered assessments:`, filteredAssessments.length);
            console.log(`🔍 Filtered assessment details:`, filteredAssessments.map((a: any) => ({ 
              contentId: a.contentId, 
              totalScore: a.totalScore, 
              percentage: a.percentage,
              attemptId: a.attemptId
            })));
              
            // Group assessments by contentId and store individual attempts
            const assessmentStats: {[contentId: string]: any} = {};
            
            filteredAssessments.forEach((assessment: any, index: number) => {
              const contentId = assessment.contentId;
              console.log(`📊 Processing assessment ${index + 1} - contentId: ${contentId}, attemptId: ${assessment.attemptId}`);
              
              if (!assessmentStats[contentId]) {
                assessmentStats[contentId] = {
                  testName: 'Saral Test',
                  attempts: []
                };
                console.log(`🆕 Created new assessment group for contentId: ${contentId}`);
              }
              
              // Add individual attempt data
              const attemptData = {
                attemptId: assessment.attemptId,
                assessmentTrackingId: assessment.assessmentTrackingId,
                totalScore: assessment.totalScore,
                maxScore: assessment.totalMaxScore,
                percentage: assessment.percentage || 0,
                lastAttempted: assessment.lastAttemptedOn,
                timeSpent: assessment.timeSpent,
                attemptNumber: assessmentStats[contentId].attempts.length + 1
              };
              
              assessmentStats[contentId].attempts.push(attemptData);
              
              console.log(`📈 ContentId ${contentId} - attempt #${attemptData.attemptNumber}: ${attemptData.totalScore}/${attemptData.maxScore} (${attemptData.percentage}%)`);
            });
            
            console.log(`🎯 Final stats for user ${userAssessment.userId}:`, assessmentStats);
            
            assessmentMap[userAssessment.userId] = {
              rawAssessments: filteredAssessments,
              stats: assessmentStats
            };
          }
        });
        
        return assessmentMap;
      }
      return {};
    } catch (error) {
      console.error('Error fetching user assessments:', error);
      return {};
    } finally {
     setAssessmentLoading(false);
    }
  }, [zatpatTestIdentifiers]);

  // Helper function to update users with assessment data
  const updateUsersWithAssessmentData = useCallback((transformedUsers: any[], assessmentMap: {[userId: string]: any}) => {
    if (assessmentMap && Object.keys(assessmentMap).length > 0) {
      const updatedUsers = transformedUsers.map((user: any) => ({
        ...user,
        assessmentStats: assessmentMap[user.userId]?.stats || {},
        totalAssessmentAttempts: assessmentMap[user.userId] ? 
          Object.values(assessmentMap[user.userId].stats).reduce((sum: number, stat: any) => sum + stat.attempts, 0) : 0,
        hasAssessments: Boolean(assessmentMap[user.userId] && Object.keys(assessmentMap[user.userId].stats).length > 0)
      }));
      setUsers(updatedUsers);
      console.log('Updated users with assessment data:', updatedUsers);
    }
  }, []);

  // Fetch users from API
  const getSearchTerm = () => {
    const normalized = searchQuery.trim();
    return normalized.length >= 3 ? normalized : '';
  };

  const fetchUsers = useCallback(
    async (page = 1, tab: string, location: LocationFilters, searchTerm = '', mode = '') => {
    const requestId = ++requestCounterRef.current;
    setLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) {
        console.error('TenantId not found in localStorage');
        setLoading(false);
        return;
      }

      const offset = (page - 1) * limit;
      
      // Build filters based on tab value
      const filters: any = {
        role: 'Learner',
        tenantId,
        tenantStatus: ['pending'],
      };

      // Add tab-specific filters
      if (tab === 'pending') {
        filters.interested_to_join = 'pending';
      } else if (tab === 'archived') {
        filters.interested_to_join = 'no';

      } else if (tab === 'upcoming') {
        filters.interested_to_join = 'yes';
      }

      // Add location filters only if they are selected
      if (location.states && location.states.length > 0) {
        filters.state = location.states;
      }
      if (location.districts && location.districts.length > 0) {
        filters.district = location.districts;
      }
      if (location.blocks && location.blocks.length > 0) {
        filters.block = location.blocks;
      }
      if (location.villages && location.villages.length > 0) {
        filters.village = location.villages;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (mode && mode !== ALL_FILTER_VALUE) {
        filters.preferred_mode_of_learning = mode;
      }

      const response = await fetchUserList({
        limit,
        offset,
        filters,
      });

      if (response && response.getUserDetails) {
        if (requestId !== requestCounterRef.current) return;
        const transformedUsers = response.getUserDetails.map(transformUserData);
        setUsers(transformedUsers);
        setTotalCount(response.totalCount || 0);
        
        // Fetch assessment data for the current page users
        const currentUserIds = transformedUsers.map(user => user.userId);
        if (currentUserIds.length > 0) {
          console.log('Calling fetchUserAssessments with userIds:', currentUserIds);
          console.log('Current zatpatTestIdentifiers:', zatpatTestIdentifiers);
          
          // If zatpat identifiers are not loaded yet, fetch them first
          if (zatpatTestIdentifiers.length === 0) {
            console.log('Zatpat identifiers not loaded, fetching them first...');
            fetchZatpatTestIdentifiers().then(identifiers => {
              if (identifiers && identifiers.length > 0) {
                console.log('Got zatpat identifiers:', identifiers, 'now fetching assessments...');
                fetchUserAssessments(currentUserIds, identifiers).then(assessmentMap => {
                  updateUsersWithAssessmentData(transformedUsers, assessmentMap);
                }).catch(error => {
                  console.error('Error in fetchUserAssessments (with identifiers):', error);
                });
              } else {
                console.log('No zatpat identifiers found, skipping assessment fetch');
              }
            }).catch(error => {
              console.error('Error fetching zatpat identifiers:', error);
            });
          } else {
            console.log('Using existing zatpat identifiers:', zatpatTestIdentifiers, 'fetching assessments...');
            fetchUserAssessments(currentUserIds).then(assessmentMap => {
              updateUsersWithAssessmentData(transformedUsers, assessmentMap);
            }).catch(error => {
              console.error('Error in fetchUserAssessments (existing identifiers):', error);
            });
          }
        }
      } else {
        if (requestId !== requestCounterRef.current) return;
        setUsers([]);
        setTotalCount(0);
      }
    } catch (error) {
      if (requestId !== requestCounterRef.current) return;
      console.error('Error fetching users:', error);
      setUsers([]);
      setTotalCount(0);
    } finally {
      if (requestId === requestCounterRef.current) {
        setLoading(false);
      }
    }
  }, [limit]);

  // Initialize zatpat test identifiers on component mount
  useEffect(() => {
    fetchZatpatTestIdentifiers();
  }, [fetchZatpatTestIdentifiers]);


  // Use ref to track previous values and prevent unnecessary calls
  const prevTabRef = useRef(tabValue);
  const prevLocationRef = useRef<string>(JSON.stringify(locationFilters));
  const prevPageRef = useRef(currentPage);
  const prevSearchRef = useRef(searchQuery);
  const prevModeRef = useRef(modeOfLearning);
  const isMounted = useRef(false);

  // Fetch users when tab, location, page, or mode changes
  useEffect(() => {
    const normalizedSearch = searchQuery.trim();
    const isSearchShort = normalizedSearch.length > 0 && normalizedSearch.length < 3;

    if (!isMounted.current) {
      isMounted.current = true;
      prevTabRef.current = tabValue;
      prevLocationRef.current = JSON.stringify(locationFilters);
      prevPageRef.current = currentPage;
      prevSearchRef.current = searchQuery;
      prevModeRef.current = modeOfLearning;
      fetchUsers(currentPage, tabValue, locationFilters, getSearchTerm(), modeOfLearning);
      return;
    }

    const tabChanged = prevTabRef.current !== tabValue;
    const locationChanged = prevLocationRef.current !== JSON.stringify(locationFilters);
    const pageChanged = prevPageRef.current !== currentPage;
    const searchChanged = prevSearchRef.current !== searchQuery;
    const modeChanged = prevModeRef.current !== modeOfLearning;

    // Skip fetch if only search changed and it is too short
    if (searchChanged && isSearchShort && !tabChanged && !locationChanged && !pageChanged && !modeChanged) {
      prevSearchRef.current = searchQuery;
      return;
    }

    const shouldFetch = tabChanged || locationChanged || searchChanged || pageChanged || modeChanged;
    if (shouldFetch) {
      if (tabChanged || locationChanged || searchChanged || modeChanged) {
        setCurrentPage(1);
        prevPageRef.current = 1;
        fetchUsers(1, tabValue, locationFilters, getSearchTerm(), modeOfLearning);
      } else if (pageChanged) {
        fetchUsers(currentPage, tabValue, locationFilters, getSearchTerm(), modeOfLearning);
      }

      prevTabRef.current = tabValue;
      prevLocationRef.current = JSON.stringify(locationFilters);
      prevPageRef.current = currentPage;
      prevSearchRef.current = searchQuery;
      prevModeRef.current = modeOfLearning;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue, locationFilters, currentPage, searchQuery, modeOfLearning]);

  // Persist non-location filters to localStorage (no expiry — cleared only via Clear button)
  useEffect(() => {
    try {
      localStorage.setItem(REGISTRATION_FILTERS_KEY, JSON.stringify({
        tabValue,
        searchQuery,
        currentPage,
        modeOfLearning,
        assessmentAttemptsFilter,
      }));
    } catch {}
  }, [tabValue, searchQuery, currentPage, modeOfLearning, assessmentAttemptsFilter]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    console.log('handleTabChange', newValue);
    setTabValue(newValue);
    setCurrentPage(1);
    setSelectedUsers(new Set());
  };

  const resetFiltersToDefault = () => {
    try { localStorage.removeItem(REGISTRATION_FILTERS_KEY); } catch {}
    setTabValue('pending');
    setSearchQuery('');
    setCurrentPage(1);
    setLocationFilters({});
    setModeOfLearning(ALL_FILTER_VALUE);
    setAssessmentAttemptsFilter(ALL_FILTER_VALUE);
    setSelectedUsers(new Set());
  };

  // Make reset function available globally for debugging (development only)
  useEffect(() => {
  if (typeof globalThis.window !== 'undefined') {
    (globalThis.window as any).resetUserRegistrationFilters = resetFiltersToDefault;
      console.log('🛠️ Reset filters function available as window.resetUserRegistrationFilters()');
    }
    
    // Cleanup function
    return () => {
      if (typeof globalThis.window !== 'undefined') {
      delete (globalThis.window as any).resetUserRegistrationFilters;
      }
    };
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleModeOfLearningChange = (mode: string) => {
    setModeOfLearning(mode);
    setCurrentPage(1);
    setSelectedUsers(new Set());
  };

  const handleAssessmentAttemptsFilterChange = (value: string) => {
    setAssessmentAttemptsFilter(value);
    setSelectedUsers(new Set());
  };

  const filteredUsers =
    assessmentAttemptsFilter && assessmentAttemptsFilter !== ALL_FILTER_VALUE
      ? users.filter(
          (user) => getUserAssessmentAttemptCount(user) === Number(assessmentAttemptsFilter)
        )
      : users;

  const handleUserSelect = (userId: string, selected: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleCancel = () => {
    setSelectedUsers(new Set());
  };

  const handleAssignBatch = () => {
    setAssignBatchModalOpen(true);
  };

  const handleAssignBatchSubmit = (data: { mode: string; center: string; batchId: string; batchName: string }) => {
    // Close assign batch modal
    setAssignBatchModalOpen(false);
    // Set batch name for success modal
    setSelectedBatchName(data.batchName);
    // Open success modal
    setSuccessModalOpen(true);
    // Clear selections
    setSelectedUsers(new Set());
  };

  const handleCallLogUpdate = (
    userId: string,
    callLog: { date: string; note: string },
    editIndex?: number
  ) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.userId === userId
          ? {
              ...user,
              callLogs:
                typeof editIndex === 'number' &&
                editIndex >= 0 &&
                editIndex < user.callLogs.length
                  ? user.callLogs.map((log: { date?: string; note?: string }, index: number) =>
                      index === editIndex
                        ? {
                            ...log,
                            date: callLog.date,
                            note: callLog.note,
                          }
                        : log
                    )
                  : [...user.callLogs, { date: callLog.date, status: 'Logged', note: callLog.note }],
            }
          : user
      )
    );
  };

  const handleMoreOptions = () => {
    setMoreOptionsOpen(true);
  };

  const handleNotInterested = async() => {
    // TODO: Implement not interested action
    const learnerIds = Array.from(selectedUsers);
    if (learnerIds.length === 0) {
      return;
    }

    const interestedToJoinFieldId = getInterestedToJoinFieldId();
    if (!interestedToJoinFieldId) {
      return;
    }

    const userDetails = {
      userData: {},
      customFields: [
        {
          fieldId: interestedToJoinFieldId,
          value: 'no',
        },
      ],
    };

    try {
      await Promise.all(learnerIds.map((userId) => editEditUser(userId, userDetails)));
    } catch (error) {
      console.error('Error updating may join next year', error);
    } finally {
      setSelectedUsers(new Set());
      setMoreOptionsOpen(false);
      setChartTrigger(prev => !prev);
      fetchUsers(currentPage, tabValue, locationFilters, getSearchTerm());
    }
  };

  const handleMayJoinNextYear = async () => {
    const learnerIds = Array.from(selectedUsers);
    if (learnerIds.length === 0) {
      return;
    }

    const interestedToJoinFieldId = getInterestedToJoinFieldId();
    if (!interestedToJoinFieldId) {
      return;
    }

    const userDetails = {
      userData: {},
      customFields: [
        {
          fieldId: interestedToJoinFieldId,
          value: 'yes',
        },
      ],
    };

    try {
      await Promise.all(learnerIds.map((userId) => editEditUser(userId, userDetails)));
    } catch (error) {
      console.error('Error updating may join next year', error);
    } finally {
      setSelectedUsers(new Set());
      setMoreOptionsOpen(false);
      setChartTrigger(prev => !prev);
      fetchUsers(currentPage, tabValue, locationFilters, getSearchTerm());
    }
  };

  const handleLocationChange = useCallback((location: LocationFilters) => {
    setLocationFilters(location);
    setCurrentPage(1);
    setSelectedUsers(new Set());
    // When the Clear button empties all filters, batch-toggle chartTrigger in the
    // same render so RegistrationPieChart gets an explicit reload signal alongside
    // the cleared locationFilters — preventing it from missing the dep change.
    if (!location.states && !location.districts && !location.blocks) {
      setChartTrigger(prev => !prev);
    }
  }, []);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    setSelectedUsers(new Set());
  };

  const selectedLearnerNames = users
    .filter((user) => selectedUsers.has(user.userId))
    .map((user) => user.name);

  // Determine select all checkbox state
  const allSelected = filteredUsers.length > 0 && filteredUsers.every(user => selectedUsers.has(user.userId));
  const someSelected = filteredUsers.some(user => selectedUsers.has(user.userId)) && !allSelected;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FBF4E4', pb: selectedUsers.size > 0 ? '80px' : 0, overflowX: 'hidden' }}>
      <Header />
      <Box sx={{ 
        // mx: 'auto', 
       p: 2, 
        // maxWidth: { xs: '100%', sm: '600px', md: '900px' },
        // width: '100%',
        // boxSizing: 'border-box'
      }}>
        {/* Location Dropdowns */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
        {t('USER_REGISTRATION.LEARNER_REGISTRATIONS')}
      </Typography>
        <Box sx={{ mb: 2, borderRadius: '8px', mt: '20px' }}>
          <LocationDropdowns onLocationChange={handleLocationChange} />
        </Box>
        
        <RegistrationPieChart locationFilters={locationFilters} triggerFetch={chartTrigger} />
        
        <RegistrationTabs value={tabValue} onChange={handleTabChange} />
        
      
        
        {/* Search and Filter Row */}
        <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
            <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    placeholder={t('USER_REGISTRATION.SEARCH_LEARNER')}
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    sx={{ 
                        bgcolor: '#fff', 
                        borderRadius: '100px',
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '100px',
                            '& fieldset': { border: 'none' },
                        }
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon sx={{ color: '#7C766F' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                    <InputLabel
                        id="mode-of-learning-label"
                        sx={{ fontSize: '12px', color: '#7C766F' }}
                    >
                        {t('USER_REGISTRATION.MODE_OF_LEARNING')}
                    </InputLabel>
                    <Select
                        labelId="mode-of-learning-label"
                        label={t('USER_REGISTRATION.MODE_OF_LEARNING')}
                        value={modeOfLearning}
                        onChange={(e) => handleModeOfLearningChange(e.target.value as string)}
                        sx={{
                            borderRadius: '8px',
                            '& .MuiSelect-select': { py: 1.5 },
                        }}
                    >
                        <MenuItem value={ALL_FILTER_VALUE}>{t('USER_REGISTRATION.ALL')}</MenuItem>
                        <MenuItem value="remote">{t('USER_REGISTRATION.REMOTE_LEARNERS')}</MenuItem>
                        <MenuItem value="regular">{t('USER_REGISTRATION.REGULAR_LEARNERS')}</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                    <InputLabel
                        id="assessment-attempts-filter-label"
                        sx={{ fontSize: '12px', color: '#7C766F' }}
                    >
                        {t('USER_REGISTRATION.ASSESSMENT_ATTEMPTS_FILTER')}
                    </InputLabel>
                    <Select
                        labelId="assessment-attempts-filter-label"
                        label={t('USER_REGISTRATION.ASSESSMENT_ATTEMPTS_FILTER')}
                        value={assessmentAttemptsFilter}
                        onChange={(e) => handleAssessmentAttemptsFilterChange(e.target.value as string)}
                        sx={{
                            borderRadius: '8px',
                            '& .MuiSelect-select': { py: 1.5 },
                        }}
                    >
                        <MenuItem value={ALL_FILTER_VALUE}>{t('USER_REGISTRATION.ALL')}</MenuItem>
                        <MenuItem value="0">{t('USER_REGISTRATION.NO_ATTEMPT')}</MenuItem>
                        <MenuItem value="1">{t('USER_REGISTRATION.ONE_ATTEMPT')}</MenuItem>
                        <MenuItem value="2">{t('USER_REGISTRATION.TWO_ATTEMPTS')}</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
        </Grid>
        
        {/* Action Banner */}
        {selectedUsers.size === 0 && (
            <Box sx={{ bgcolor: '#EAE0D5', p: 1.5, mb: 2, borderRadius: '8px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '14px', color: '#4A4640', fontWeight: 500 }}>
                    {t('USER_REGISTRATION.TO_TAKE_ACTION_SELECT_LEARNER')}
                </Typography>
            </Box>
        )}

        {/* Select All Checkbox */}
        {filteredUsers.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', bgcolor: '#fff', p: 1.5, borderRadius: '8px' }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(new Set(filteredUsers.map((user) => user.userId)));
                              } else {
                                setSelectedUsers(new Set());
                              }
                            }}
                            sx={{ 
                                '&.Mui-checked': { color: '#1E1B16' },
                                '&.MuiCheckbox-indeterminate': { color: '#1E1B16' }
                            }}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#1E1B16' }}>
                            {allSelected 
                                ? t('USER_REGISTRATION.DESELECT_ALL') || 'Deselect All'
                                : t('USER_REGISTRATION.SELECT_ALL') || 'Select All'}
                            {selectedUsers.size > 0 && ` (${selectedUsers.size})`}
                        </Typography>
                    }
                />
            </Box>
        )}

        <Box sx={{ mt: 2 }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <CircularProgress />
                </Box>
            ) : filteredUsers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#7C766F', fontSize: '16px' }}>
                        {t('USER_REGISTRATION.NO_LEARNERS_FOUND')}
                    </Typography>
                </Box>
            ) : (
                <>
                    {filteredUsers.map((user) => (
                        <UserCard 
                            key={user.userId} 
                            user={user}
                            isSelected={selectedUsers.has(user.userId)}
                            onSelectChange={handleUserSelect}
                            onCallLogUpdate={handleCallLogUpdate}
                        />
                    ))}
                    {/* Pagination Section */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mt: 4, 
                        mb: 2,
                        gap: 2
                    }}>
                        {/* Page Info */}
                        <Typography sx={{ 
                            color: '#7C766F', 
                            fontSize: '14px',
                            fontWeight: 500
                        }}>
                            {totalCount > 0 ? (
                                <>
                                    {t('USER_REGISTRATION.SHOWING_LEARNERS', {
                                        start: (currentPage - 1) * limit + 1,
                                        end: Math.min(currentPage * limit, totalCount),
                                        total: totalCount
                                    })}
                                    {Math.ceil(totalCount / limit) === 1 && t('USER_REGISTRATION.SINGLE_PAGE')}
                                </>
                            ) : (
                                t('USER_REGISTRATION.NO_RECORDS_FOUND')
                            )}
                        </Typography>
                        
                        {/* Pagination Controls */}
                        {totalCount > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Pagination
                                    count={Math.max(1, Math.ceil(totalCount / limit))}
                                    page={currentPage}
                                    onChange={handlePageChange}
                                    color="primary"
                                    size="medium"
                                    showFirstButton
                                    showLastButton
                                    siblingCount={1}
                                    boundaryCount={1}
                                    sx={{
                                        '& .MuiPaginationItem-root': {
                                            color: '#1E1B16',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            '&:hover': {
                                                backgroundColor: '#F5F5F5',
                                            },
                                            '&.Mui-disabled': {
                                                opacity: 0.5,
                                            },
                                        },
                                        '& .Mui-selected': {
                                            backgroundColor: '#FDBE16 !important',
                                            color: '#1E1B16 !important',
                                            fontWeight: 600,
                                            '&:hover': {
                                                backgroundColor: '#FDBE16 !important',
                                            },
                                        },
                                        '& .MuiPaginationItem-ellipsis': {
                                            color: '#7C766F',
                                        },
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                </>
            )}
        </Box>
      </Box>

      {/* Bottom Action Bar */}
      <BottomActionBar
        selectedCount={selectedUsers.size}
        onCancel={handleCancel}
        onAssignBatch={handleAssignBatch}
        onMoreOptions={handleMoreOptions}
        showMoreOptions={tabValue === 'pending'}
      />

      {/* Assign Batch Modal */}
      <AssignBatchModal
        open={assignBatchModalOpen}
        onClose={() => setAssignBatchModalOpen(false)}
        selectedLearners={selectedLearnerNames}
        selectedLearnerIds={Array.from(selectedUsers)}
        onAssign={handleAssignBatchSubmit}
        locationFilters={locationFilters}
      />

      {/* Success Modal */}
      <AssignBatchSuccessModal
        open={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
          setChartTrigger(prev => !prev);
          fetchUsers(currentPage, tabValue, locationFilters, getSearchTerm());
        }}
        batchName={selectedBatchName}
      />

      {/* More Options Bottom Sheet */}
      <MoreOptionsBottomSheet
        open={moreOptionsOpen}
        onClose={() => setMoreOptionsOpen(false)}
        selectedCount={selectedUsers.size}
        onNotInterested={handleNotInterested}
        onMayJoinNextYear={handleMayJoinNextYear}
      />
    </Box>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default withRole([
  TENANT_DATA.SECOND_CHANCE_PROGRAM,
  TENANT_DATA.SECOND_CHANCE_PROGRAM_PATHWAYS,
])(UserRegistrationList);
