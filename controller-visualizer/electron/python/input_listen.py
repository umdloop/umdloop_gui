from evdev import InputDevice, list_devices, ecodes, categorize
import asyncio, json, sys
import pygame
from time import sleep
import math
#Make sure evdev is installed on system
keyboards = []
controllers = []
mouse = []
devices = [InputDevice(path) for path in list_devices()]
pygame.init()
pygame.joystick.init()
joysticks = {}
#simple_coords = True
controller_axis = [0,45,90,135,180,225,270,315]
last_coords = []
arrow_axis = {16:"ah",17:"av"}
deadzone = 0.1

print("Detected:",pygame.joystick.get_count(),"joysticks")

#Not gonna create any Hot swappable shit- Takes too much to input.
#Im gonna tell them to quit and retry again

#Create Array of Joysticks
for controller_device in range(pygame.joystick.get_count()):
    #Calls All Joysticks + Initializes

    joystick = pygame.joystick.Joystick(controller_device)
    #Initializes Joystick
    joystick.init()
    
    joysticks[joystick.get_name()] = joystick

    #Makes Each Connected Controller Vibrate
    try:
        joystick.rumble(1.0, 5.0, 750)
        sleep(0.7)
        joystick.stop_rumble()
    except e:
        print("No Rumble for:",joystick.get_name())

#Disable the Touchpad on Controller
#Try to disable mouse inputs completely because we don't need that read
###Fix to top: If connected to virtual usb, counts as virtual controller. 

for dev in devices:

    caps = dev.capabilities()
    #All keys from a keybaord
    keys = caps.get(ecodes.EV_KEY, [])
    
    #Abs = Joystick Movement
    abs_axes = caps.get(ecodes.EV_ABS, [])
    #Wheel Position
    rel_axes = caps.get(ecodes.EV_REL, [])

    # Detect keyboard
    if rel_axes and (ecodes.REL_X in rel_axes or ecodes.REL_Y in rel_axes):
        mouse.append(dev)
        print("Mouse Detected", dev.path, dev.name)        
    elif ecodes.KEY_A in keys and ecodes.KEY_Z in keys:
        keyboards.append(dev)
        print("Keyboard detected:", dev.path, dev.name)
    # Detect controller / joystick / gamepad
    elif abs_axes and keys:
        controllers.append(dev)
        print("Controller detected:", dev.path, dev.name)

print("\nStarting input listeners...\n")

#Type keyboard for mouse
async def read_device(device, device_type):
    global last_coords
    async for event in device.async_read_loop():
        if event.type == ecodes.EV_KEY and event.code in ecodes.BTN:
            #Convert the Event Code to a Button Event
            btn_code = ecodes.BTN[event.code]
            
            #Mouse + Controller Buttons here

            #Default to the first_code option
            if(len(btn_code)<4):
                btn_code = btn_code[0]
            data = {
                "type": device_type,
                "device": device.name,
                "input": "button",
                "code": btn_code[len("BTN_"):].lower(),
                "value": event.value
            }
            print("Mouse/Button:", data, flush=True)
            sys.stdout.write(json.dumps(data) + "\n")
            sys.stdout.flush()
            
        elif event.type == ecodes.EV_KEY:
            data = {
                "type": device_type,
                "device": device.name,
                "input": "button",
                "code": ecodes.KEY[event.code][len("KEY_"):].lower(), #String Concats until KEY_###
                "value": event.value  # 1=down, 0=up, 2=hold
            }
            print("Button Pressed: "+data["code"],flush = True)
            sys.stdout.write(json.dumps(data)+ "\n")
            sys.stdout.flush()

        # Analog sticks / triggers
        elif event.type == ecodes.EV_ABS:
            if(event.code == 2 or event.code == 5):
                #If triggers, else
                data = {
                    "type": "triggers",
                    "device": device.name,
                    "input": "axis",
                    "code": event.code,
                    "value": event.value
                }
                print("Triggers",data)
                sys.stdout.write(json.dumps(data)+ "\n")
                sys.stdout.flush()
            elif(event.code == 16 or event.code == 17):
                #These are the Directional arrow Buttons
                #16|17 -1|0|1
                #av = Arrow Vertical
                #ah = Arrow Horizontal
                #p = positive
                #n = negative

                #Dict = {16:"av_p"/"av_n", 17: "av_p"/"av_n"}
                #This dictates direction of that specific axis
                axis_dir = event.value
                if(event.value!=0):
                    set_dir = "av" if(event.code==17) else "ah"#code
                    set_opt = "_p" if(event.value == 1) else "_n"#val
                    axis_dir = set_dir + set_opt
                data = {
                    "type": "arrows",
                    "device": device.name,
                    "input": "button",
                    "code": event.code,
                    "value": axis_dir
                }
                sys.stdout.write(json.dumps(data)+ "\n")
                sys.stdout.flush()
            else:
                #Updates Controller Values iff Axis event fires
                pygame.event.pump()
                #Get the Controller Associated with Event.
                controller = joysticks[device.name]
                #Apply Lambda function to all values here
                deadzone_value = lambda x: 0 if abs(x) < deadzone else round(x,2)
                #If previous_axes = [0,0,0,0] --> Don't fire?
                left_x,left_y,right_x,right_y = deadzone_value(controller.get_axis(0)),deadzone_value(controller.get_axis(1)),deadzone_value(controller.get_axis(3)),deadzone_value(controller.get_axis(4))
                axis_coords = [None,None]
                #Just means it didn't move...? 
                if(left_x!=0 or left_y!=0):
                    #Applies Cartesian Coordinates
                    axis_coords[0] = (-1 * math.atan2(left_y,left_x) * (180/math.pi) + 360)%360
                    #Applies Common Cartesian Angles
                    axis_coords[0] = min(controller_axis,key = lambda deg:abs(deg-axis_coords[0]))
                if(right_x!=0 or right_y!=0):
                    #Applies Cartesian Coordinates
                    axis_coords[1] = (-1 * math.atan2(right_y,right_x) * (180/math.pi)+360)%360
                    #Converts into common angles for Svgs
                    axis_coords[1]= min(controller_axis,key = lambda deg:abs(deg-axis_coords[1]))
                
                #Check both coords to not be none 
                #If axis_coords aren't the same as the last input recorded
                if(axis_coords!=last_coords):
                    data = {
                        "type": device_type,
                        "device": device.name,
                        "input": "axis",
                        "code": "controller",
                        "value":axis_coords 
                    }
                    last_coords = axis_coords.copy()
                    sys.stdout.write(json.dumps(data)+ "\n")
                    sys.stdout.flush()
#[1] PYTHON SAYS: {"type": "keyboard", "device": "Logitech G Pro", "input": "button", "code": 272, "value": 1} 
#[1] PYTHON SAYS: {"type": "keyboard", "device": "Logitech G Pro", "input": "button", "code": 272, "value": 0}



loop = asyncio.get_event_loop()

for dev in keyboards:
    loop.create_task(read_device(dev, "keyboard"))

for dev in controllers:
    loop.create_task(read_device(dev, "controller"))

for dev in mouse:
    loop.create_task(read_device(dev, "mouse"))

loop.run_forever()