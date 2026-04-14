'use client';
import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import styles from './page.module.css';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`itinerary-tabpanel-${index}`}
      aria-labelledby={`itinerary-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box className={styles.tabPanelBody}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ItineraryPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box className={styles.pageRoot}>
      <Typography variant="h3" className={styles.pageTitle}>
        2026 Itinerary
      </Typography>

      <Box className={styles.contentWrap}>
        <Box className={styles.datesCard}>
          <Box className={styles.tabsBorder}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              className={styles.tabs}
            >
              <Tab label="Wed 4/22" />
              <Tab label="Thu 4/23" />
              <Tab label="Fri 4/24" />
              <Tab label="Sat 4/25" />
            </Tabs>
          </Box>

          <TabPanel value={selectedTab} index={0}>
            <Typography variant="h5" className={styles.dayTitle}>
              Wednesday 4/22/26
            </Typography>
            <Box component="ul" className={styles.dayList}>
              <li className={styles.dayListItem}>
                4:00 PM: Patroners arrive and check in at the Mountain Top Clubhouse (clubhouse for Payne&apos;s Valley).
              </li>
              <li className={styles.dayListItem}>Dinner plans are on your own.</li>
            </Box>
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            <Typography variant="h5" className={styles.dayTitle}>
              Thursday 4/23/26
            </Typography>
            <Box component="ul" className={styles.dayList}>
              <li className={styles.dayListItem}>
                7:20 AM - 9:10 AM: Round 1 at Buffalo Ridge, Two Man Better Ball.
              </li>
              <li className={styles.dayListItem}>Lunch and dinner plans are on your own.</li>
              <li className={styles.dayListItem}>Pick up swag at the cabins (details to come).</li>
            </Box>
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            <Typography variant="h5" className={styles.dayTitle}>
              Friday 4/24/26
            </Typography>
            <Box component="ul" className={styles.dayList}>
              <li className={styles.dayListItem}>
                7:30 AM - 9:20 AM: Round 2 at Payne&apos;s Valley, Two Man Better Ball.
              </li>
              <li className={styles.dayListItem}>Lunch plans are on your own.</li>
              <li className={styles.dayListItem}>
                1:45 PM - 4:30 PM: Cliffhangers (no official scoring).
              </li>
              <li className={styles.dayListItem}>7:00 PM - 9:00 PM: Catered dinner by the cabins.</li>
            </Box>
          </TabPanel>

          <TabPanel value={selectedTab} index={3}>
            <Typography variant="h5" className={styles.dayTitle}>
              Saturday 4/25/26
            </Typography>
            <Box component="ul" className={styles.dayList}>
              <li className={styles.dayListItem}>
                10:30 AM - 12:20 PM: Round 3 at Ozark National, Head to Head.
              </li>
              <li className={styles.dayListItem}>
                6:30 PM - 9:30 PM: End-of-trip dinner at the Top of the Rock Wine Cellar.
              </li>
            </Box>
          </TabPanel>
        </Box>

        <Box className={styles.notesWrap}>
          <Typography variant="h5" className={styles.dayTitle}>
            Shipsticks Note
          </Typography>
          <Typography variant="body1" className={styles.dayBody}>
            Clubs will arrive at the big tent where you get your carts for Payne&apos;s Valley, Cliffhangers, and Ozark National.
            <br /><br />
            When filling out forms on Shipsticks, use:
            <br />
            - Your name
            <br />
            - Group/booking name
            <br />
            - First course of play
            <br />
            - Date of first round
          </Typography>

          <br />
          <Typography variant="h5" className={styles.dayTitle}>
            Course Location Notes
          </Typography>
          <Typography variant="body1" className={styles.dayBody}>
            Payne&apos;s Valley, Cliffhangers, and Ozark National share a practice facility at Ozark National. All three courses start at the big tent between Payne&apos;s Valley and Ozark National at the bottom of the hill.
            <br /><br />
            There is a separate putting green by the Payne&apos;s Valley clubhouse (Mountain Top Clubhouse). Buffalo Ridge has its own separate facility with a driving range.
          </Typography>

          <br />
          <Typography variant="h5" className={styles.dayTitle}>
            Shuttle Notes
          </Typography>
          <Typography variant="body1" className={styles.dayBody}>
            The shuttle system is not as efficient as Bandon or Pebble, so order your shuttle with plenty of time. You can call from your room or download the JM Nature Resorts Shuttle app from your phone&apos;s app store.
            <br /><br />
            When going to the area with the gym, restaurants, and Top of the Rock, the shuttle ride may take 20-30 minutes from pickup. Plan accordingly.
          </Typography>

          <br />
          <Typography variant="h5" className={styles.dayTitle}>
            Webmaster&apos;s Special Note
          </Typography>
          <Typography variant="body1" className={styles.dayBody}>
            If you are a bourbon/whiskey fan, Harry&apos;s Cocktail Lounge &amp; Bar has an amazing selection.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
} 