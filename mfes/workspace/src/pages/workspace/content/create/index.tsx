
import React, { useEffect, useState } from 'react';
import Layout from '../../../../components/Layout';
import {
  Typography,
  Box,
  useTheme,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import ContentCard from '../../../../components/ContentCard';
import DescriptionIcon from '@mui/icons-material/Description';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import UploadIcon from '@mui/icons-material/Upload';
import { useRouter } from 'next/router';
import {
  createCourse,
  createQuestionSet,
} from '../../../../services/ContentService';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import Image from 'next/image';
import WorkspaceText from '../../../../components/WorkspaceText';
import { getLocalStoredUserId } from '../../../../services/LocalStorageService';
import useTenantConfig from '../../../../hooks/useTenantConfig';
import WorkspaceHeader from '../../../../components/WorkspaceHeader';
import { isSecondChanceTenant } from '../../../../utils/app.constant';

const CreatePage = () => {
  const tenantConfig = useTenantConfig();
  const theme = useTheme();
  const [selectedKey, setSelectedKey] = useState('create');
  const [showHeader, setShowHeader] = useState<boolean | null>(null);
  const [isSCP, setIsSCP] = useState<boolean>(false);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'course' | 'questionSet' | null>(
    null
  );
  const [modalLabel, setModalLabel] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalNameError, setModalNameError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = getLocalStoredUserId();

    const headerValue = localStorage.getItem('showHeader');
    setShowHeader(headerValue === 'true');

    // Set isSCP based on localStorage program value
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const isSCPValue = isSecondChanceTenant(localStorage.getItem('program'));
      setIsSCP(isSCPValue);
    }

    if (token && userId) {
      document.cookie = `authToken=${token}; path=/; secure; SameSite=Strict`;
      document.cookie = `userId=${userId}; path=/; secure; SameSite=Strict`;
    }
  }, []);

  const handleOpenModal = (type: 'course' | 'questionSet') => {
    setModalType(type);
    setModalLabel(type === 'course' ? 'Course Name' : 'Question Set Name');
    setModalName('');
    setModalNameError('');
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setModalType(null);
    setModalLabel('');
    setModalName('');
    setModalNameError('');
  };
  const handleCreate = async () => {
    if (!modalName.trim()) {
      setModalNameError(`${modalLabel} is required`);
      return;
    }
    setModalNameError('');
    setShowModal(false);
    if (modalType === 'course') {
      await fetchCollectionData(modalName);
    } else if (modalType === 'questionSet') {
      await fetchQuestionSetData(modalName);
    }
  };

  const fetchCollectionData = async (name?: string) => {
    try {
      const userId = getLocalStoredUserId();
      const response = await createCourse(
        userId,
        tenantConfig?.CHANNEL_ID,
        tenantConfig?.CONTENT_FRAMEWORK,
        tenantConfig?.COLLECTION_FRAMEWORK,
        name // Pass the course name here
      );
      console.log('Course set created successfully:', response);

      const identifier = response?.result?.identifier;
      router.push({
        pathname: `/collection`,
        query: { identifier }, // Pass name as query param
      });
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const fetchQuestionSetData = async (name?: string) => {
    try {
      console.log('tenantConfig?.QUESTION_SET_FRAMEWORK', tenantConfig?.QUESTION_SET_FRAMEWORK);
      const response = await createQuestionSet(
        tenantConfig?.QUESTION_SET_FRAMEWORK,
        name
      );

      console.log('Question set created successfully:', response);
      const identifier = response?.result?.identifier;
      router.push({
        pathname: `/editor`,
        query: { identifier },
      });
    } catch (error) {
      console.error('Error creating question set:', error);
    }
  };

  const openCollectionEditor = () => {
    fetchCollectionData();
  };

  const cardData = [
    {
      title: 'New Question Set',
      description: 'Create assessments, question banks, quizzes, etc.',
      icon: <QuizOutlinedIcon fontSize="large" />,
      onClick: () => handleOpenModal('questionSet'),
    },
    {
      title: 'New Course',
      description: ' Create courses by defining content, assessments, etc',
      icon: <SchoolOutlinedIcon fontSize="large" />,
      onClick: () => handleOpenModal('course'),
    },
    {
      title: 'New Content',
      description: 'Create new documents, PDF, video, QML, HTML, etc.',
      icon: <VideoLibraryOutlinedIcon fontSize="large" />,
      onClick: () => {
        sessionStorage.setItem('previousPage', window.location.href);
        router.push('/upload-editor');
      },
    },
    {
      title: 'Create New Large Content', // Added "Create" to the title
      description: 'Create videos and documents larger than 150mb', // Updated description
      icon: <img src={'/150+.png'} alt="large-video" height={35} width={70} />, // Correct as is
      onClick: () => {
        sessionStorage.setItem('previousPage', window.location.href); // No change needed
        router.push({
          pathname: '/upload-editor',
          query: { editorforlargecontent: 'true' }, // No change needed
        }); // Removed an extra comma
      },
    },
    {
      title: 'Manage Course Shell',
      description: 'Create and manage course shells',
      icon: <ViewQuiltOutlinedIcon fontSize="large" />,
      onClick: () => router.push('/workspace/content/shell-manage'),
    },
...(isSCP
      ? [
          {
            title: 'AI Assessment Creator',
            description: 'Generate assessments and question sets with AI',
            icon: (
              <PsychologyOutlinedIcon
                fontSize="large"
                sx={{ transform: 'scale(-1, 1)' }}
              />
            ),
            onClick: () => router.push(`/ai-assessment-creator`),
          },
        ]
      : []),
  ];

  return (
    <>
      {showHeader && <WorkspaceHeader />}
      <Layout selectedKey={selectedKey} onSelect={setSelectedKey}>
        <WorkspaceText />

        {/* Outer box for "Create new content" heading and cards */}
        <Box
          sx={{
            background: 'linear-gradient(to bottom, white, #F8EFDA)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: theme.shadows[3],
          }}
          m={3} // Margin around the box for spacing
        >
          <Typography
            variant="h4"
            sx={{ mb: 2 }}
            fontSize={'16px'}
            fontWeight={600}
          >
            Create new content
          </Typography>

          <Box
            display="flex"
            gap="1rem"
            justifyContent="flex-start"
            flexWrap="wrap"
          >
            <Grid container spacing={2}>
              {cardData.map((card, index) => (
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6} key={index}>
                  <Paper
                    key={index}
                    elevation={3}
                    onClick={card.onClick}
                    sx={{
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      flex: '1 1 180px',
                      // maxWidth: "220px",
                      // minHeight: "114px",
                      border: 'solid 1px #D0C5B4',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                    className="create-card"
                  >
                    {card?.icon}
                    <Typography
                      className="one-line-text"
                      variant="h3"
                      sx={{ mt: 1, fontWeight: 'bold', fontSize: '14px' }}
                    >
                      {card?.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      className="two-line-text"
                      color="textSecondary"
                      sx={{ mt: 1, mb: 0 }}
                    >
                      {card?.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
        <Dialog open={showModal} onClose={handleCloseModal}>
          <DialogTitle>Enter {modalLabel}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={modalLabel}
              type="text"
              fullWidth
              value={modalName}
              onChange={(e) => {
                const value = e.target.value;
                // Allow letters (all languages), combining marks, numbers, spaces, and select punctuation: & ( ) _ - : ; ? , .
                if (/^[\p{L}\p{M}\p{N} &()_\-:;?,.]*$/u.test(value)) {
                  setModalName(value);
                  if (modalNameError) setModalNameError('');
                } else {
                  setModalNameError(
                    'Only letters, numbers, spaces, and & ( ) _ - : ; ? , . are allowed. Quotes are not allowed.'
                  );
                }
              }}
              error={!!modalNameError}
              helperText={modalNameError}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} color="secondary">
              Close
            </Button>
            <Button onClick={handleCreate} color="primary" variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Layout>
    </>
  );
};

export default CreatePage;
