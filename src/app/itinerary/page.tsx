'use client';
import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

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
        <Box sx={{ py: 3 }}>
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
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      <Typography variant="h3" sx={{ mb: 4, fontWeight: 700, color: '#2c3e50' }}>
        2025 Patron Cup Itinerary
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 900, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: '#666666',
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                textTransform: 'none',
                '&.Mui-selected': {
                  color: '#2c3e50',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2c3e50',
              },
            }}
          >
            <Tab label="June 4" />
            <Tab label="June 5" />
            <Tab label="June 6" />
            <Tab label="June 7" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50', mb: 2 }}>
            Wednesday
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Arrival on property. Your rooms will be under your name and are in the Chrome Lake Cottages. Please, each guy needs to check in individually so you can set up your on-resort profile AND collect your goodie bag at the front desk.
            <br /><br />
            Your &ldquo;Goodie Bag&rdquo; will contain your shirt, vest, hat, and drink tickets (explained below).
            <br /><br />
            We have timed your initial round at Shorty&apos;s with the arrival information you provided (see attached Wednesday pdf). Please make sure you show at your designated time and if you are delayed please let the course know directly. Your Shorty&apos;s round will be billed directly to your room. Any no-show for any of our re-rounds will be billed IN FULL to your room so don&apos;t skip.
            <br /><br />
            Note- Shorty&apos;s is set up to be all about fun, take a few clubs and some cocktails and enjoy. They will allow up to 8 people to play at a time so if two adjoining groups would like to group up, they won&apos;t give you a hard time, cut loose.
            <br /><br />
            No dinner plans, the hope is that we congregate after rounds and dinners at the Bunker Bar or one of the other bars on property. Signal will be the best option for this. Weather permitting we likely will have an annual Patron Walk-About down 18 of Bandon, grab a little whiskey and stretch the legs, perhaps Dr Balog will find the ocean again.
          </Typography>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50', mb: 2 }}>
            Thursday
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            First official day of 2025 Patron Cup! We are playing Pacific Dunes and the format will be 2-Man Better Ball. This is a simple format, most of you have played it many times, where we will be taking the better net score from the two-some and comparing it against the better score of your competitors two-some. A win on the hole is a +1, tie is a 0, and a loss is a -1. Please turn in your COMPLETED score card clearly showing points and winner to your captain or your captain&apos;s designated scorer (bitch).
            <br /><br />
            We have arranged breakfast (Burritos and Sandwiches) on/near the first tee for each day. Please grab ONE and enjoy a cocktail at the bar we will also have on the tee for you. The drink tickets provided in your goodie bag will be used for your drink, the bartender will handle the rest. If you don&apos;t want to use your drink coupon, share it with your partner or other cuppers, the point of this thing is to have fun, low stress, get drunk if you can. If you want an additional drink, or you forget your ticket, they can bill to your room for you.
            <br /><br />
            Re-Rounds; your reround times and foursomes have been determined by your morning tee time. Please know that the move from Pacific Dunes to Bandon Trails will take some time so you don&apos;t really have time to mill around. My recommendation is to move to the course for your re-round and grab a quick bite at Trails End if you can, Beef Ramen and warm Miso soup. Those of you at Preserve later in the evening obviously have ample time to hang. We have 10 guys mixed into 3 tee times for Preserve. Like Shorty&apos;s you can group up in any sized group you&apos;d like. I&apos;d recommend combining just so everybody is hanging, you can all work that out on your own.
            <br /><br />
            Dinner on your own and group drinking TBD
          </Typography>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50', mb: 2 }}>
            Friday
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Day two of the Patron Cup! We should have updated scores for everybody in the morning so you know where you stand! Day two is also a 2-Man Better Ball but will be at Sheep Ranch, the newest course on property. Know that Sheep Ranch is the longest jaunt for all of the course to get to, so allow time to get there and stretch. Like Day one we will have breakfast burritos and sandwiches on/near the tee box and a bar for morning libations.
            <br /><br />
            DAY TWO TWIST! Unlike Day 1 when everybody is settling in and Day 3 when everybody is dialed to try and win their individual match, Day 2 is about the true spirit of Patron Cup…. debauchery and pirate behavior. With that said, your committee has provided a special rule for Day 2, SHOTGUN MULLIGANS!!! If a shot would like to be retaken, anywhere on the hole, a golfer can earn a mulligan by doing a shot of booze or shotgunning a beer/seltzer. If you don&apos;t drink and your partner is willing to fall on the sword for you, your partner can be designated to drink for you. The beer or shot must be taken PRIOR to the second shot being made. We will have Fireball shots on the first tee for you to put in your bag, 8 per two-some pair, so grab them and make your caddie carry your booze. If you don&apos;t want fireball, figure it out, we aren&apos;t picky what you choose as long as it&apos;s boozy.
            <br /><br />
            Re-rounds; same as Day 2, just a different course, please time accordingly. Old Mac for most of you is near Sheep Ranch so you won&apos;t have to go too far for your re-round. There is Irish fare at Sheep Ranch club house if you need to grab something enroute.
            <br /><br />
            Dinner on your own and group drinking TBD
          </Typography>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50', mb: 2 }}>
            Saturday
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Day three of the Patron Cup, singles matches! Day three is always the highlight day, your chance to compete head-to-head. There are 24 matches on day three meaning 24 points can trade places. As many of you know, we have seen plenty of Patron Cups won and lost due to play of Day three. Day three is scored the same as the prior days however it&apos;s just your individual score vs your competitor&apos;s individual score, no teamwork here.
            <br /><br />
            We DO NOT have breakfast on the tee this morning due to the later start. Please plan breakfast and morning drinks accordingly.
            <br /><br />
            Awards Dinner; We have dinner planned for our awards, celebration, and tribal taunting of the losing team. Come hungry and thirsty as we have a full spread for you along with an open bar, so let&apos;s make them regret it! Dinner runs from 6:00 pm to 8:00 pm at Trails End Restaurant. We should have fire pits and hang areas so dress warm if you want to enjoy the patio a bit. We will be celebrating another successful year for Patron Cup, awarding the trophy to the winning captain, handing out the trip awards for the Davey Jones Locker and the Matt Leinhart Biggest Disappointment. In addition to the awards next year&apos;s destination will be announced which is being finalized this week. We will also have something special for the group to enjoy in honor of our fallen comrade Kevin Levin who left us this past summer. Please join us in remembering a unique character in the only way Levin would appreciate.
          </Typography>
        </TabPanel>
      </Box>
    </Box>
  );
} 