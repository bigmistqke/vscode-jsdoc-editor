import type { Component } from 'solid-js'
import styles from './App.module.css'
import logo from './logo.svg'

const App: Component = () => {
  function handleHowdyClick() {
    window.vscode.postMessage({
      command: 'hello',
      text: 'Hey there partner! 🤠',
    })
  }
  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <img src={logo} class={styles.logo} alt="logo" />
        <button onClick={handleHowdyClick}>hello</button>
      </header>
    </div>
  )
}

export default App
