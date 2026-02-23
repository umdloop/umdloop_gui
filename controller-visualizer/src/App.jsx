import { useEffect,useState } from 'react';
import {PressedKeyIcons} from "../assets/Keyboard/pressed"
import {KeyIcons} from "../assets/Keyboard/unpressed"
//import {PressedControllerIcons} from "../assets/Controller/pressed"
import {ControllerIcons} from "../assets/Controller/unpressed"
import  ControllerOutline from "../assets/Controller/outline.svg?react"
import {MouseIcons} from "../assets/Mouse/sides"
import MouseOutline from "../assets/Mouse/body.svg?react" 
import {AxisIcons} from "../assets/Controller/joystick"
import "./App.css"
const KEY_LAYOUT = [
  ["grave","1","2","3","4","5","6","7","8","9","0","minus","equal","backspace"],
  ["tab","q","w","e","r","t","y","u","i","o","p","leftbrace","rightbrace","backslash"],
  ["capslock","a","s","d","f","g","h","j","k","l","semicolon","apostrophe","enter"],
  ["leftshift","z","x","c","v","b","n","m","comma","dot","slash","rightshift"],
  ["leftctrl","leftmeta","leftalt","space","rightalt","delete","rightctrl"]
  ];

const CONTROLLER_LAYOUT = [
  ["ah_n","ah_p","av_n","av_p"],//Same Scale
  ["north","west","a","b"]//Same Scale
];
const MOUSE_LAYOUT = [
  ["left","right"],
]
//const controller_scale = {"triggers":,"bumpers":,"buttons","arrow","joystick"}
let low_trig_color = "#59E73D"
let med_trig_color = "#3B9A28"
let high_trig_color = "#26611A"

const unpressed_colors = "#717267"
const pressed_colors = "#5776FF"

const background_color = "#FCFFCC"

//const Filled_Controller_Colors = {"bumper":"#5776FF"}

//Arrow Value: {"ah_n":false}
//arrowValue[event.code] = event.value
//16:ah_n | ah_p | 0
//17:av_n | av_p | 0
function App() {

  //Will append/remove everytime a key is pressed
  const [buttonPressed,setButtonPressed] = useState({});//Pop add remove
  const [controllerPressed,setControllerValue] = useState({});
  const [mouseValue,setMouseValue] = useState({});
  const [controllerAxis,setAxisValue] = useState({});
  const [triggerValue,setTriggerValue] = useState({});
  
  //Store 2 Axis: {"L":[X,Y],"R":[X,Y]}
  useEffect(() => {
    window.api.onInputEvent((event) => {
      if(event.input==="axis")
      {
        //Axis Means stick / Trigger movement btw
        setAxisValue(prev => {
          const axis_values = {...prev};
          axis_values[event.type] = event.value;//Going to call {"controller":[]}
          return axis_values;
        })
        //Code 16, Status -1,0,1
        //Code:17, Status: -1,0,1
      }
      //Returns a blank for now
      //The rest of these will be button/mouse inputs
      switch(event.type)
      {
        case "mouse":
          setMouseValue(prev => {
          const mouse_inputs = {...prev}//Previous results
          if(event.value === 0)
            delete mouse_inputs[event.code]
          else
            mouse_inputs[event.code] =  true;
          return mouse_inputs; 
          })
          break;
        case "controller":
          setControllerValue(prev => {
          const button_list = {...prev}//Previous results
          if(event.value === 0)
            delete button_list[event.code]
          else
            button_list[event.code] =  true;
          return button_list; 
          })
          break;
        case "keyboard":
          setButtonPressed(prev => {
          const next = {...prev};//takes previous values as a dict
          if(event.value === 0)
            delete next[event.code]
            else
              next[event.code] = true //Key is pressed
            return next;
          })
          break;
        case "arrows":
          setControllerValue(prev => {
            const next = {...prev}
            //Sets alll Arrows to a value
            if(event.code == 16)
            {
              next["ah_n"] = "ah_n"===event.value,
              next["ah_p"] =  "ah_p"===event.value
              //Auto fills to false
              //Since we know these values can't be activated simmultaneously
              next["av_n"] = false;
              next["av_p"] = false;
            }
            else
            {
              next["av_n"] = "av_n"===event.value,
              next["av_p"] = "av_p"===event.value
              next["ah_n"] = false
              next["ah_p"] =  false
            }
              
            return next;
          })
          break;
        case "triggers":
          setTriggerValue(prev => {
            const next = {...prev}
            //if(event.value ===  0)
              //delete next[event.code]
            //else
              //Values go from 0 - 255 instead of 0 or 1
            next[event.code] = 255 - event.value
            return next;
          })
      }
    })},[])
  //I'll ask him if we need to track recent text. 
  //Options to choose your own color? 
  return(<div style = {{backgroundColor:background_color}}>
    <h1>
      Keyboard + Controller Visualizer
    </h1>
    <div style = {{display:"flex",flexDirection:"column",justifyContent:"center"}}>
      <Keyboard layout = {KEY_LAYOUT} pressedButtons = {buttonPressed}/>
    <Controller layout = {CONTROLLER_LAYOUT} triggerValue = {triggerValue} controllerPressed = {controllerPressed} controllerAxis = {controllerAxis}/>
    </div>
    
  </div>);

}
export default App;

function Keyboard({layout,pressedButtons,buttonSize=53})
{
  //let key_size = 53;
  let key_height_scale = 53/50;
  let custom_size_key = {
    "backspace":1.925,"tab":1.51,"backslash":1.41,"capslock":1.89,"enter":2.08,
    "leftshift":2.51,"rightshift":2.51,
    "leftctrl":1.23,"leftmeta":1.23,"leftalt":1.23,"space":6.62,"rightalt":1.23,"delete":1.23,"rightctrl":1.23
  };
  return(
    <div className="keyboard">
      {layout.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row" style = {{display:"flex",justifyContent:"flex-start",alignItems:"center",flexDirection:"row"}}>
          {row.map(key => {
            //Checks current button key status
            const isPressed = !!pressedButtons[key];

            const Icon = isPressed ? PressedKeyIcons[key] : KeyIcons[key];
            
            if(!Icon)
            {
              console.warn("Missing Key for ",key,isPressed);
              return null;
            }
            //Apply multiplyer to special keys to scale with the rest of the keyboard
            //key_size = key in custom_size_key ? buttonSize * custom_size_key[key] : buttonSize
            
            return (
              <Icon
                key={key}
                width={key in custom_size_key ? buttonSize * custom_size_key[key] : buttonSize}
                height = {key_height_scale * buttonSize}
                style = {{fill:isPressed ? "green":"red"}}
                className={isPressed ? "pressed" : ""}
              />
            );
          })}
        </div>
      ))}
    </div>
  )
}

// This function should be able to load all detected devices 
function Axis({axis_value,axis_side,AxisIcons})
{
  //Loop through globbed_names
  const icon_val = ["s-".concat((axis_value[axis_side] == null ? "cen" : axis_value[axis_side]).toString())]
  const Icon = AxisIcons[icon_val]
  return(
    <div className = "ControllerAxis">
      {
        <Icon key = {icon_val}/>     
      }
    </div>
  )
}
function Controller({triggerValue,controllerPressed,controllerAxis,buttonSize=73})
{
  //position:"absolute"
  const LeftTrig = ControllerIcons["left"]
  const RightTrig = ControllerIcons["right"]
  //For thing in list
  const bumpers = [{key:"tl",Icon:ControllerIcons["tl"]},{key:"tr",Icon:ControllerIcons["tr"]}]
  let Select =ControllerIcons["select"]
  let Center = ControllerIcons["center"]//size:buttonSize * 3.92}
  let Start = ControllerIcons["start"]//,size:buttonSize}]
  
  //Defined Vertical Arrows

  //const ver_arrows = [{key:"av_n",Icon:ControllerIcons["av_n"]},{key:"av_p",Icon:ControllerIcons["av_p"]}]
  let BottomArrow = ControllerIcons["av_p"]
  let TopArrow = ControllerIcons["av_n"]
  const hor_arrows = [{key:"ah_n",Icon:ControllerIcons["ah_n"]},{key:"ah_p",Icon:ControllerIcons["ah_p"]}]
  
  
  const hor_buttons = [{key:"west",Icon:ControllerIcons["west"]},{key:"b",Icon:ControllerIcons["b"]}]
  //Deifned Vertical buttons
  let Triangle = ControllerIcons["north"]
  let X = ControllerIcons["a"]
 
  return (
    <div className = "Controller">
      <div className = "Triggers">
        <LeftTrig style = {{fill: (triggerValue[2] < 86) ? high_trig_color : (triggerValue[2] < 171) ? med_trig_color : low_trig_color}}/>
        <RightTrig style = {{fill: (triggerValue[5] < 86) ? high_trig_color : (triggerValue[5] < 171) ? med_trig_color : low_trig_color}}/>
      </div>
      <div className = "Bumpers">
        {bumpers.map(({key,Icon}) => (
          <Icon key = {key}  style = {{fill: !!controllerPressed[key] ? pressed_colors : unpressed_colors}}/>
        ))}
      </div>
      <ControllerOutline className = "Controller-Bg" width = {buttonSize * 9.26} style = {{fill:"white"}}/>
      
      <div className = "center">
        <Select className = "side_button" style = {{fill:!!controllerPressed["select"] ? pressed_colors : unpressed_colors}}/>
        <Center style = {{fill:"white"}}/>
        <Start className = "side_button" style = {{fill:!!controllerPressed["start"] ? pressed_colors : unpressed_colors}}/>
      </div>

      <div className = "Arrows">
        <div className="topArrow">
          <TopArrow key = {"topArrow"} style = {{fill:!!controllerPressed["av_n"] ? pressed_colors : unpressed_colors}}/>
        </div>
        <div className = "HorArrows">
          {hor_arrows.map(({key,Icon})=>(
              <Icon key = {key} style = {{fill:!!controllerPressed[key] ? pressed_colors : unpressed_colors}}/>
            ))}
        </div>
        <div className = "bottomArrow">
          <BottomArrow key = {"bottomArrow"} style = {{fill:!!controllerPressed["av_p"] ? pressed_colors : unpressed_colors}}/>
        </div>
      </div>


      <div className = "Buttons">
        <div className = "topButton">
          <Triangle key = {"triangle"} style = {{fill:!!controllerPressed["north"] ? pressed_colors : unpressed_colors}}/>
        </div>
        <div className = "HorButtons">
          {hor_buttons.map(({key,Icon})=>(
              <Icon key = {key} style = {{fill:!!controllerPressed[key] ? pressed_colors : unpressed_colors}}/>
            ))}
        </div>
        <div>
          <X key = {"X"} style = {{fill:!!controllerPressed["a"] ? pressed_colors : unpressed_colors}}/>
        </div>
        
      </div> 
      
      <div className = "axis">
        <Axis axis_value = {controllerAxis["controller"] || [null, null]} axis_side = {0} AxisIcons = {AxisIcons}/>
        <Axis axis_value = {controllerAxis["controller"] || [null, null]} axis_side = {1} AxisIcons = {AxisIcons}/>
      </div>
    </div>
  )
}

function Mouse({buttonSize=74})
{

  return(
  <div className='Mouse'>  

  </div>)
}