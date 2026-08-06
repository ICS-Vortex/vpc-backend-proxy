import {
  proxyActivitiesAllocations,
  proxyActivitiesCurrent,
  proxyActivitiesSchedule,
} from '@/controllers/proxy/activitiesController';
import { proxyIndex, proxyPing } from '@/controllers/proxy/indexController';
import {
  proxyPilotsAllocations,
  proxyPilotsBanlist,
  proxyPilotsCurrent,
} from '@/controllers/proxy/pilotsController';
import {
  proxyRaceTracksConfigs,
  proxyRaceTracksList,
  proxyRacesList,
} from '@/controllers/proxy/racesController';
import { proxyRightsList } from '@/controllers/proxy/rightsController';
import {
  proxySeriesList,
  proxySeriesRoundPilotResults,
  proxySeriesRoundStandings,
  proxySeriesRounds,
} from '@/controllers/proxy/seriesController';
import { requireProxyServer } from '@/middleware/proxyServerAuth';
import { Router } from 'express';

const proxyRouter = Router();

proxyRouter.get('/', proxyIndex);
proxyRouter.head('/', proxyIndex);
proxyRouter.post('/ping', proxyPing);

proxyRouter.get('/activities/schedule', requireProxyServer, proxyActivitiesSchedule);
proxyRouter.get('/activities/current', requireProxyServer, proxyActivitiesCurrent);
proxyRouter.get('/activities/:activity/allocations', proxyActivitiesAllocations);

proxyRouter.get('/pilots/banlist', requireProxyServer, proxyPilotsBanlist);
proxyRouter.get('/pilots/current', requireProxyServer, proxyPilotsCurrent);
proxyRouter.get('/pilots/:activity/allocations', proxyPilotsAllocations);

proxyRouter.get('/rights/list', requireProxyServer, proxyRightsList);

proxyRouter.get('/races/list', requireProxyServer, proxyRacesList);

proxyRouter.get('/tracks/list', requireProxyServer, proxyRaceTracksList);
proxyRouter.get('/tracks/configs', requireProxyServer, proxyRaceTracksConfigs);

proxyRouter.get('/series/list', requireProxyServer, proxySeriesList);
proxyRouter.get('/series/:series/rounds', requireProxyServer, proxySeriesRounds);
proxyRouter.get('/series/rounds/:round/standings', requireProxyServer, proxySeriesRoundStandings);
proxyRouter.get('/series/rounds/:round/pilots/:pilot/results', requireProxyServer, proxySeriesRoundPilotResults);

export default proxyRouter;
