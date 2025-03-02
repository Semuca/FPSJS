import { LoadFileText } from '../loading';
import { run_rpg } from './rpg_scene';

run_rpg(JSON.parse(await LoadFileText('scripts/rpg/map.json')));
