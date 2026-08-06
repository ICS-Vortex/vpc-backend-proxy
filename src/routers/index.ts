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

proxyRouter.use(requireProxyServer);

proxyRouter.get('/activities/schedule', proxyActivitiesSchedule);
proxyRouter.get('/activities/current', proxyActivitiesCurrent);
proxyRouter.get('/activities/:activity/allocations', proxyActivitiesAllocations);

proxyRouter.get('/pilots/banlist', proxyPilotsBanlist);
proxyRouter.get('/pilots/current', proxyPilotsCurrent);
proxyRouter.get('/pilots/:activity/allocations', proxyPilotsAllocations);

proxyRouter.get('/rights/list', proxyRightsList);

proxyRouter.get('/races/list', proxyRacesList);

proxyRouter.get('/tracks/list', proxyRaceTracksList);
proxyRouter.get('/tracks/configs', proxyRaceTracksConfigs);

proxyRouter.get('/series/list', proxySeriesList);
proxyRouter.get('/series/:series/rounds', proxySeriesRounds);
proxyRouter.get('/series/rounds/:round/standings', proxySeriesRoundStandings);
proxyRouter.get('/series/rounds/:round/pilots/:pilot/results', proxySeriesRoundPilotResults);

export default proxyRouter;
