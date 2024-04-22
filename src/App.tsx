import { useEffect, useRef } from 'react'
import { TiledViewModel } from './molstar';
import './App.css'

function App() {
  return <>
    <MolStar />
    <Controls />
  </>
}

function MolStar() {
  const parent = useRef<any>();

  useEffect(() => {
    async function mount() {
      await TiledViewModel.initialized;
      TiledViewModel.mount(parent.current);
    }
    mount();
    return () => {
      // mount/unmount needs to be a queue because of asynchronous calls
      TiledViewModel.unmount();
    };
  }, []);

  return (
    <div ref={parent} style={{ position: 'absolute', inset: 0, bottom: 50 }} />
  )
}

function Controls() {
  return <div style={{  position: 'absolute', bottom: 0, height: 50, left: 0, right: 0 }}>
    <button onClick={() => TiledViewModel.loadData()}>Load Data</button>
  </div>
}

export default App
