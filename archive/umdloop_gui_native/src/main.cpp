#include "LoopGui.h"
#include <QApplication>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    
    LoopGui window;
    window.show();
    
    return app.exec();
}