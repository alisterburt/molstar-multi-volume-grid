/* this entity grid */
import {PluginContext} from 'molstar/lib/mol-plugin/context'
import {DefaultPluginSpec, PluginSpec} from 'molstar/lib/mol-plugin/spec'
import {Canvas3DContext} from 'molstar/lib/mol-canvas3d/canvas3d'
import {Camera} from 'molstar/lib/mol-canvas3d/camera';
import {AssetManager} from 'molstar/lib/mol-util/assets';
import {Vec3} from 'molstar/lib/mol-math/linear-algebra';
import {EntityList} from './EntityList';
import {Rows, Cols, N} from './Grid';
import {loadEmdb} from "./utils/io.ts";
import {outsideViewport} from "./utils/interaction.ts";

export class EntityGrid {
  private initDone: () => void = undefined as any;
  initialized = new Promise<void>(res => {
    this.initDone = res;
  })

  contexts: PluginContext[] = [];
  container: HTMLDivElement = undefined as any;
  canvas: HTMLCanvasElement = undefined as any;

  mount(parent: HTMLElement) {
    parent.appendChild(this.container);
  }

  unmount() {
    this.container.parentElement?.removeChild(this.container);
  }

  async loadData() {
    for (let i = 0; i < N; i++) {
      if (i >= EntityList.length) break;

      const [emd, pdb] = EntityList[i];
      if (!emd) continue;

      loadEmdb(this.contexts[i], emd);
    }
  }


  syncCamera(snapshot: Camera.Snapshot, pivot: PluginContext) {
    const delta = Vec3.normalize(Vec3(), Vec3.sub(Vec3(), snapshot.target, snapshot.position));
    for (const plugin of this.contexts) {
      if (plugin === pivot) continue;

      const base = plugin.canvas3d!.camera.getSnapshot();
      const dist = Vec3.distance(base.position, base.target);
      const camera: Camera.Snapshot = {
        ...base,
        position: Vec3.add(Vec3(), base.position, Vec3.scale(Vec3(), delta, dist)),
        up: snapshot.up,
      }

      if (!Camera.areSnapshotsEqual(camera, snapshot)) {
        plugin.canvas3d?.requestCameraReset({snapshot, durationMs: 0});
      }
    }
  }

  handleCameraSync(plugin: PluginContext) {
    let isInteracting = false;
    plugin.canvas3d?.input.move.subscribe(({x, y, inside}) => {
      isInteracting = inside && !outsideViewport(plugin.canvas3d!.input, plugin.canvas3d!.camera, x, y);
      console.log(isInteracting);
    })

    // this will cause a memory leak because events need to be unsubed.
    plugin.canvas3d?.didDraw?.subscribe(() => {
      if (isInteracting) this.syncCamera(plugin.canvas3d!.camera.getSnapshot(), plugin);
    });
  }

  async init() {
    this.container = document.createElement('div');
    this.canvas = document.createElement('canvas');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    })
    Object.assign(this.canvas.style, {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    })
    this.container.appendChild(this.canvas);

    const context3d = Canvas3DContext.fromCanvas(this.canvas, new AssetManager());

    for (let i = 0; i < N; i++) {
      const row = i % Rows;
      const col = Math.floor(i / Rows);

      const defaultSpec = DefaultPluginSpec();
      const spec: PluginSpec = {
        ...defaultSpec,
        canvas3d: {
          ...defaultSpec.canvas3d,
          viewport: {
            name: 'relative-frame',
            params: {
              width: 1 / Cols,
              height: 1 / Rows,
              x: col / Cols,
              y: row / Rows,
            }
          }
        }
      };

      const plugin = new PluginContext(spec);
      this.contexts.push(plugin);
      await plugin.init();
      plugin.initViewer(this.canvas, this.container, context3d);
      this.handleCameraSync(plugin);
    }

    this.initDone();
  }
}