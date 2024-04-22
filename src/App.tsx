import {useEffect, useRef} from 'react'
import {EntityGrid} from './EntityGrid';
import './App.css'

function App() {
  return <>
    <EntityGridView/>
    <Controls/>
  </>
}

// where should this be initialised?
const entityGrid = new EntityGrid();
entityGrid.init();

function EntityGridView() {
  const parent = useRef<any>();

  useEffect(() => {
    async function mount() {
      await entityGrid.initialized;
      entityGrid.mount(parent.current);
    }

    mount();
    return () => {
      // mount/unmount needs to be a queue because of asynchronous calls
      entityGrid.unmount();
    };
  }, []);

  return (
    <div ref={parent} style={{position: 'absolute', inset: 0, bottom: 50}}/>
  )
}

function Controls() {
  return <div style={{position: 'absolute', bottom: 0, height: 50, left: 0, right: 0}}>
    <button onClick={() => entityGrid.loadData()}>Load Data</button>
  </div>
}

export default App
