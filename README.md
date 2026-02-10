Adaptive Cricket: Final Year Project

python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 🏏 Adaptive Cricket 

An AI-powered cricket simulation that uses **Reinforcement Learning (RL)** to identify a batsman's weaknesses in real-time. The system adapts the bowling strategy (Speed, Line, Length, Spin) based on "Hit" or "Miss" feedback from the player.

## 🏗️ Architecture

The project is a Monorepo divided into three core components:

| Component | Tech Stack | Description |
| :--- | :--- | :--- |
| **Simulation** | Unity + C# | Physics engine, visuals, and user input. |
| **Backend** | Python (FastAPI) | Hosting the RL Agent (Brain) & WebSocket Server. |
| **Dashboard** | Django + Next.js | *[In Progress]* Analytics and performance visualization. |

## 📂 Project Structure

```text
adaptive-cricket/
├── .venv/                    # Shared Python Virtual Environment
├── backend/
│   ├── fastapi/
│   │   ├── main.py
│   │   └── rl_model.zip      # The Trained AI Brain
│   ├── django/  
│   │   ├── manage.py
│   │   └── dashboard/
│   ├── requirements.txt      # Python Dependencies
├── simulation/
│   ├── Assets/               # Unity Scripts & Prefabs
│   └── ProjectSettings/      # Unity Configuration
└── README.md

```

* * * * *

🚀 Getting Started
------------------

### 1\. Prerequisites

-   **Unity Hub** (Editor Version: 2022.3.x)

-   **Python 3.10+**

-   **Git LFS** (Large File Storage) - *Required for Unity assets*

### 2\. Installation

Clone the repository and pull large files:

Bash

```
git clone [https://github.com/your-username/adaptive-cricket.git](https://github.com/your-username/adaptive-cricket.git)
cd adaptive-cricket
git lfs pull

```

### 3\. Backend Setup (AI Brain)

Activate the virtual environment and install dependencies:

**Windows:**

Bash

```
# Create venv (if not exists)
python -m venv .venv

# Activate
.venv\Scripts\activate

# Install Libraries
pip install -r backend/requirements.txt

```

**Mac/Linux:**

Bash

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

```

* * * * *

🎮 How to Run
-------------

### Step 1: Start the AI Server

Open your terminal in the **`backend/`** folder and run:

Bash

```
# Ensure you are using the venv python
../.venv/Scripts/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

```

*You should see: `Waiting for application startup... Application startup complete.`*

### Step 2: Start the Simulation

1.  Open **Unity Hub** -> Add Project -> Select the `simulation` folder.

2.  Open the project.

3.  Navigate to **Assets/Scenes** and open your main scene.

4.  Press the **▶ Play** button at the top.

* * * * *

🕹️ Controls (Keyboard)
-----------------------

Once Unity is playing and the server is connected:

1.  **Press 'S'**: **Start Game**. The machine will bowl the first ball.

2.  **Watch the Ball**.

3.  **Provide Feedback**:

    -   **Press 'H' (HIT):** You hit the ball (Bad for AI).

    -   **Press 'M' (MISS):** You missed the ball (Good for AI).

*The AI will instantly analyze your feedback and adjust the next delivery to find your blind spot.*

* * * * *

🛠️ Troubleshooting
-------------------

-   **Unity Connection Error:** Ensure the server is running on `ws://127.0.0.1:8000/ws/game`.

-   **ModuleNotFoundError (Python):** Ensure you are running python from the `.venv` folder as shown in the run command.

-   **Empty Unity Scene:** Double-click the `.unity` file in `Assets/Scenes` to load the correct level.