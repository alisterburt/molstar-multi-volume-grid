/* this entity grid */
import {PluginContext} from 'molstar/lib/mol-plugin/context'
import {DefaultPluginSpec, PluginSpec} from 'molstar/lib/mol-plugin/spec'
import {Canvas3DContext} from 'molstar/lib/mol-canvas3d/canvas3d'
import {Camera} from 'molstar/lib/mol-canvas3d/camera';
import {AssetManager} from 'molstar/lib/mol-util/assets';
import {Vec3} from 'molstar/lib/mol-math/linear-algebra';
import {EntityList} from './EntityList';
import {Layout, getBestLayout} from './utils/layout.ts';
import {loadEmdb} from "./utils/io.ts";
import {outsideViewport} from "./utils/interaction.ts";

export class EntityGrid {
  private initDone: () => void = undefined as any;
  initialized = new Promise<void>(res => {
    this.initDone = res;
  })
  context3d: Canvas3DContext;
  contexts: PluginContext[] = [];
  container: HTMLDivElement = undefined as any;
  canvas: HTMLCanvasElement = undefined as any;
  nItems: number = 1;
  layout: Layout;
  resizeDebounceTimeout: number = 60;
  resizeObserver: ResizeObserver;

  mount(parent: HTMLElement) {
    parent.appendChild(this.container);
  }

  unmount() {
    this.container.parentElement?.removeChild(this.container);
  }

  async loadData() {
    for (let i = 0; i < this.nItems; i++) {
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

  // constructor(n: number = 1) {
  //   this.n = n;
  // }
  //
  // get n(): number {
  //   return this._n;
  // }
  //
  // set n(value: number) {
  //   this._n = value;
  //   this.onNChanged();
  // }

  disposePluginContexts(): void {
    for (let i = this.contexts.length - 1; i >= 0; i--) {
      this.contexts[i].dispose();
      this.contexts.splice(i, 1); // Remove the disposed context from the array
    }
  }

  async createPluginContexts(): Promise<void> {

    let defaultSpec = DefaultPluginSpec();
    defaultSpec = {
      ...defaultSpec,
      canvas3d: {
        ...defaultSpec.canvas3d,
        viewport: {
          name: 'relative-frame',
          params: {
            width: 0.1,
            height: 0.1,
            x: 0.45,
            y: 0.45,
          }
        }
      }
    };

    for (let i: number = 0; i < this.nItems; i++) {
      const pluginContext = new PluginContext(defaultSpec);
      this.contexts.push(pluginContext);
      await pluginContext.init();
      pluginContext.initViewer(this.canvas, this.container, this.context3d);
      this.handleCameraSync(pluginContext);
    }
    this.updateCanvasPositions();

    // let i = 0;
    // const nRows: number = this.layout?.length;
    // for (const [rowIndex, nColumns] of this.layout.entries()) {
    //   for (let colIndex = 0; colIndex < nColumns; colIndex++) {
    //     const defaultSpec = DefaultPluginSpec();
    //     const spec: PluginSpec = {
    //       ...defaultSpec,
    //       canvas3d: {
    //         ...defaultSpec.canvas3d,
    //         viewport: {
    //           name: 'relative-frame',
    //           params: {
    //             width: 1 / nColumns,
    //             height: 1 / nRows,
    //             x: colIndex / nColumns,
    //             y: rowIndex / nRows,
    //           }
    //         }
    //       }
  };


  updateCanvasPositions(): void {
    const nRows: number = this.layout?.length;
    let i: number = 0;
    for (const [rowIndex, nColumns] of this.layout.entries()) {
      for (let colIndex = 0; colIndex < nColumns; colIndex++) {
        const ctx = this.contexts[i];
        ctx.canvas3d?.setProps(
          {
            viewport: {
              name: 'relative-frame',
              params: {
                width: 1 / nColumns,
                height: 1 / nRows,
                x: colIndex / nColumns,
                y: rowIndex / nRows
              }
            }
          }
        )
      i++;
      }
    }
  }


  // async onNChanged() {
  //     this.disposePluginContexts();
  //     this.createPluginContexts();
  //   }


  async init(n: number = 1) {
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
    this.resizeObserver = new ResizeObserver(this.debounce(this.onCanvasResize.bind(this), this.resizeDebounceTimeout));
    this.resizeObserver.observe(this.canvas);
    this.nItems = n;
    this.layout = getBestLayout(this.nItems, 1, 1);
    this.context3d = Canvas3DContext.fromCanvas(this.canvas, new AssetManager());
    await this.createPluginContexts();
    this.initDone();
  }

  private debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  private onCanvasResize(entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      if (entry.target === this.canvas) {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.layout = getBestLayout(this.nItems, height, width);
        this.updateCanvasPositions();
      }
    }
  }
}